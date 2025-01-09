import type { PortablePath }    from '@yarnpkg/fslib'

import assert                   from 'node:assert'

import { Configuration }        from '@yarnpkg/core'
import { Project }              from '@yarnpkg/core'
import { StreamReport }         from '@yarnpkg/core'
import { Filename }             from '@yarnpkg/fslib'
import { xfs }                  from '@yarnpkg/fslib'
import { ppath }                from '@yarnpkg/fslib'
import deepmerge                from 'deepmerge'

import tsconfig                 from '@atls/config-typescript'

import { AbstractToolsCommand } from './abstract-tools.command.js'

const combineMerge = (
  target: Array<any>,
  source: Array<any>,
  options?: deepmerge.ArrayMergeOptions
): Array<any> => {
  const destination = target.slice()

  /* eslint-disable @typescript-eslint/no-unsafe-argument */
  source.forEach((item: any, index: number) => {
    if (typeof destination[index] === 'undefined') {
      destination[index] = options?.cloneUnlessOtherwiseSpecified(item, options)
    } else if (options?.isMergeableObject(item)) {
      destination[index] = deepmerge(target[index], item, options)
    } else if (!target.includes(item)) {
      destination.push(item)
    }
  })
  /* eslint-enable @typescript-eslint/no-unsafe-argument */

  return destination
}

const convertWorkspacesToIncludes = (workspaces: string): string => {
  if (workspaces.endsWith('/**/*')) {
    return workspaces
  }

  if (!workspaces.endsWith('/**/*') && workspaces.endsWith('/*')) {
    return workspaces.replace('/*', '/**/*')
  }

  return workspaces
}

export class ToolsSyncTSConfigCommand extends AbstractToolsCommand {
  static override paths = [['tools', 'sync', 'tsconfig']]

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular()
    }

    return this.executeProxy(['tools', 'sync', 'tsconfig'])
  }

  override async executeRegular(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Tools sync typescript config', async () => {
          const tsconfigpath = ppath.join(
            project.topLevelWorkspace.cwd,
            'tsconfig.json' as PortablePath
          )

          const exists: typeof tsconfig.compilerOptions = (await xfs.existsPromise(tsconfigpath))
            ? await xfs.readJsonPromise(tsconfigpath)
            : { compilerOptions: {} }

          await xfs.writeFilePromise(
            ppath.join(project.topLevelWorkspace.cwd, 'project.types.d.ts' as PortablePath),
            '/// <reference types="@atls/code-runtime/types" />\n'
          )

          const config = deepmerge(
            exists,
            { compilerOptions: tsconfig.compilerOptions },
            { arrayMerge: combineMerge }
          )

          const includes: Array<string> = (
            (project.topLevelWorkspace.manifest.raw.workspaces as Array<string>) || []
          ).map(convertWorkspacesToIncludes)

          const created = {
            ...config,
            include: Array.from(
              new Set(['project.types.d.ts', ...((config as any).include || []), ...includes])
            ),
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
