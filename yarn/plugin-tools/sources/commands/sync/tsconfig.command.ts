import type { PortablePath }                 from '@yarnpkg/fslib'

import assert                                from 'node:assert'

import { StreamReport }                      from '@yarnpkg/core'
import { xfs }                               from '@yarnpkg/fslib'
import { ppath }                             from '@yarnpkg/fslib'

import { resolveWorkspaceCommandInvocation } from '@atls/raijin/commands'
import { shouldExecuteCommandProxy }         from '@atls/raijin/commands'
import tsconfig                              from '@atls/raijin/typescript-config'

import { AbstractRaijinSyncCommand }         from './base.js'
import { createRaijinSyncTarget }            from './target.js'

const projectTypesIncludeEntry = 'project.types.d.ts'

export const projectTypesReference = '/// <reference types="@atls/raijin/types" />\n'

const implicitTSConfigIncludeEntry = '**/*'

type TSConfigShape = Record<string, unknown>
type TSCompilerOptions = Record<string, unknown>

const convertWorkspacesToIncludes = (workspaces: string): string => {
  if (workspaces.endsWith('/**/*')) {
    return workspaces
  }

  if (!workspaces.endsWith('/**/*') && workspaces.endsWith('/*')) {
    return workspaces.replace('/*', '/**/*')
  }

  return workspaces
}

const hasTSConfigEntry = (config: TSConfigShape, key: string): boolean => Object.hasOwn(config, key)

export const mergeTSCompilerOptions = (
  defaults: TSCompilerOptions,
  existing: TSCompilerOptions | undefined
): TSCompilerOptions => ({
  ...defaults,
  ...(existing || {}),
})

export const getTSConfigIncludeEntries = (
  config: TSConfigShape,
  workspaceIncludes: Array<string>
): Array<string> | undefined => {
  const tsconfigIncludes: Array<string> = (() => {
    if (Array.isArray(config.include)) {
      return config.include.filter((item): item is string => typeof item === 'string')
    }

    if (!hasTSConfigEntry(config, 'include')) {
      if (hasTSConfigEntry(config, 'files') || hasTSConfigEntry(config, 'extends')) {
        return []
      }

      return [implicitTSConfigIncludeEntry]
    }

    return []
  })()

  if (tsconfigIncludes.length === 0 && !hasTSConfigEntry(config, 'include')) {
    return undefined
  }

  return Array.from(new Set([projectTypesIncludeEntry, ...tsconfigIncludes, ...workspaceIncludes]))
}

export class RaijinSyncTSConfigCommand extends AbstractRaijinSyncCommand {
  static override paths = [['raijin', 'sync', 'tsconfig']]

  override async execute(): Promise<number> {
    if (shouldExecuteCommandProxy()) {
      return this.executeProxy(['raijin', 'sync', 'tsconfig'])
    }

    return this.executeRegular()
  }

  override async executeRegular(): Promise<number> {
    const { configuration, project } = await resolveWorkspaceCommandInvocation(
      this.context.cwd,
      this.context.plugins
    )

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Raijin sync typescript config', async () => {
          const syncTarget = createRaijinSyncTarget(project)
          const tsconfigpath = ppath.join(syncTarget.cwd, 'tsconfig.json' as PortablePath)

          const exists: TSConfigShape & { compilerOptions?: TSCompilerOptions } =
            (await xfs.existsPromise(tsconfigpath))
              ? await xfs.readJsonPromise(tsconfigpath)
              : { compilerOptions: {} }

          await xfs.writeFilePromise(
            ppath.join(syncTarget.cwd, 'project.types.d.ts' as PortablePath),
            projectTypesReference
          )

          const config = {
            ...exists,
            compilerOptions: mergeTSCompilerOptions(
              tsconfig.compilerOptions,
              exists.compilerOptions
            ),
          }

          const includes: Array<string> = syncTarget.workspaces.map(convertWorkspacesToIncludes)

          const include = getTSConfigIncludeEntries(config, includes)

          const created = {
            ...config,
            ...(include ? { include } : {}),
          }

          try {
            assert.deepEqual(exists, created)
          } catch {
            await xfs.writeJsonPromise(tsconfigpath, created)
          }
        })
      }
    )

    return commandReport.exitCode()
  }
}
