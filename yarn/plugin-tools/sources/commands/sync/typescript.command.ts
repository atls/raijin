import type { Ident }                     from '@yarnpkg/core'
import type { Package }                   from '@yarnpkg/core'
import type { Project }                   from '@yarnpkg/core'

import { StreamReport }                   from '@yarnpkg/core'
import { Filename }                       from '@yarnpkg/fslib'
import { structUtils }                    from '@yarnpkg/core'

import { resolveWorkspaceCommandContext } from '@atls/yarn-plugin-tools/command-context'

import { AbstractRaijinSyncCommand }      from './base.js'

const NPM_PROTOCOL = 'npm:'
const PATCH_PROTOCOL = 'patch:'
const PATCH_SOURCE_PATTERN = /^patch:[^@]+@([^#]+)#/
const raijinIdent = structUtils.parseIdent('@atls/raijin')
const typescriptIdent = structUtils.parseIdent('typescript')

export const findStoredPackageByIdent = (
  packages: Iterable<Package>,
  ident: Ident
): Package | undefined =>
  Array.from(packages).find((storedPackage) => storedPackage.identHash === ident.identHash)

export const normalizeTypeScriptRange = (range: string | undefined): string | undefined => {
  if (!range) {
    return undefined
  }

  const normalizedRange = range.startsWith(PATCH_PROTOCOL)
    ? decodeURIComponent(range.match(PATCH_SOURCE_PATTERN)?.[1] ?? range)
    : range

  if (normalizedRange.startsWith(NPM_PROTOCOL)) {
    return normalizedRange.slice(NPM_PROTOCOL.length)
  }

  return normalizedRange
}

export const getRaijinTypeScriptRange = (project: Project): string | undefined =>
  normalizeTypeScriptRange(
    findStoredPackageByIdent(project.storedPackages.values(), raijinIdent)?.dependencies.get(
      typescriptIdent.identHash
    )?.range
  )

export const shouldSyncTypeScriptRange = (
  currentRange: string | undefined,
  raijinTypeScriptRange: string
): boolean =>
  normalizeTypeScriptRange(currentRange) !== normalizeTypeScriptRange(raijinTypeScriptRange)

export class RaijinSyncTypeScriptCommand extends AbstractRaijinSyncCommand {
  static override paths = [['raijin', 'sync', 'typescript']]

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular()
    }

    if (process.env.COMMAND_PROXY_EXECUTION === 'true') {
      return this.executeRegular()
    }

    return this.executeProxy(['raijin', 'sync', 'typescript'])
  }

  override async executeRegular(): Promise<number> {
    const { configuration, project, workspace } = await resolveWorkspaceCommandContext(
      this.context.cwd,
      this.context.plugins
    )

    await project.restoreInstallState()

    const raijinTypeScriptRange = getRaijinTypeScriptRange(project)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Raijin sync typescript version', async () => {
          if (!raijinTypeScriptRange) {
            return
          }

          if (workspace.manifest.raw.devDependencies) {
            const ident = structUtils.parseIdent('typescript')

            let descriptor = Array.from(workspace.manifest.devDependencies.values()).find(
              (target) => target.scope === ident.scope && target.name === ident.name
            )

            if (!descriptor || shouldSyncTypeScriptRange(descriptor.range, raijinTypeScriptRange)) {
              descriptor = structUtils.makeDescriptor(ident, raijinTypeScriptRange)
            }

            workspace.manifest.devDependencies.set(descriptor.identHash, descriptor)

            await project.persist()
          }
        })
      }
    )

    return commandReport.exitCode()
  }
}
