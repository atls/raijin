import type { Ident }                from '@yarnpkg/core'
import type { Package }              from '@yarnpkg/core'

import { Configuration }             from '@yarnpkg/core'
import { Project }                   from '@yarnpkg/core'
import { StreamReport }              from '@yarnpkg/core'
import { Filename }                  from '@yarnpkg/fslib'
import { structUtils }               from '@yarnpkg/core'
import semver                        from 'semver'

import { AbstractRaijinSyncCommand } from './base.js'

const codeRuntimeIdent = structUtils.parseIdent('@atls/code-runtime')
const typescriptIdent = structUtils.parseIdent('typescript')

export const findStoredPackageByIdent = (
  packages: Iterable<Package>,
  ident: Ident
): Package | undefined =>
  Array.from(packages).find((storedPackage) => storedPackage.identHash === ident.identHash)

export const getCodeRuntimeTypeScriptRange = (project: Project): string | undefined =>
  findStoredPackageByIdent(project.storedPackages.values(), codeRuntimeIdent)?.dependencies.get(
    typescriptIdent.identHash
  )?.range

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
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)
    const codeRuntimeTypeScriptRange = getCodeRuntimeTypeScriptRange(project)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Raijin sync typescript version', async () => {
          if (!codeRuntimeTypeScriptRange) {
            return
          }

          if (project.topLevelWorkspace.manifest.raw.devDependencies) {
            const ident = structUtils.parseIdent('typescript')

            let descriptor = Array.from(
              project.topLevelWorkspace.manifest.devDependencies.values()
            ).find((target) => target.scope === ident.scope && target.name === ident.name)

            if (!descriptor) {
              descriptor = structUtils.makeDescriptor(ident, codeRuntimeTypeScriptRange)
            }

            if (
              semver.valid(semver.coerce(descriptor.range)) &&
              semver.valid(semver.coerce(codeRuntimeTypeScriptRange))
            ) {
              if (
                !semver.eq(
                  semver.coerce(descriptor.range) || '',
                  semver.coerce(codeRuntimeTypeScriptRange) || ''
                )
              ) {
                descriptor.range = codeRuntimeTypeScriptRange
              }
            }

            project.topLevelWorkspace.manifest.devDependencies.set(descriptor.identHash, descriptor)

            await project.persist()
          }
        })
      }
    )

    return commandReport.exitCode()
  }
}
