import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { join }                         from 'node:path'
import { resolve }                      from 'node:path'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'
import { Text }                         from 'ink'
import { render }                       from 'ink'
import React                            from 'react'

import { toNativeCwd }                  from '@atls/raijin/commands'

import { writeBuildException }          from './presentation.jsx'
import { writeBuildResult }             from './presentation.jsx'
import { buildLibrary }                 from './run.js'

export class LibraryBuildCommand extends BaseCommand {
  static override paths = [['library', 'build']]

  static override usage = BaseCommand.Usage({
    description: 'build a library workspace',
  })

  target = Option.String('-t,--target', './dist')

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    const cwd = toNativeCwd(this.context.invocation.executionCwd)
    const progress =
      Reflect.get(this.context.stdout, 'isTTY') === true
        ? render(<Text>Building library...</Text>, {
            exitOnCtrlC: false,
            patchConsole: false,
            stdout: this.context.stdout as NodeJS.WriteStream,
          })
        : undefined
    let progressStopped = false
    const stopProgress = (): void => {
      if (progressStopped) return

      progress?.clear()
      progress?.unmount()
      progressStopped = true
    }

    try {
      const result = await buildLibrary({
        cwd,
        sourceRoot: join(cwd, 'src'),
        targetRoot: resolve(cwd, this.target),
      })

      stopProgress()
      writeBuildResult(this.context, cwd, result)

      return result.kind === 'completed' ? 0 : 1
    } catch (error) {
      stopProgress()
      writeBuildException(this.context, error)

      return 1
    } finally {
      stopProgress()
    }
  }
}
