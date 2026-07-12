import { resolve }                    from 'node:path'
import { isAbsolute }                 from 'node:path'

import { BaseCommand }                from '@yarnpkg/cli'
import { Option }                     from 'clipanion'
import { render }                     from 'ink'
import React                          from 'react'

import { ErrorInfo }                  from '@atls/cli-ui-error-info-component'
import { FormatProgress }             from '@atls/cli-ui-format-progress-component'
import { Formatter }                  from '@atls/code-format'
import { renderStatic }               from '@atls/cli-ui-renderer-static-component'
import { resolveWorkspaceInvocation } from '@atls/raijin/commands'
import { toNativeCwd }                from '@atls/raijin/commands'

export const resolveFormatTargetFiles = (
  files: Array<string>,
  invocationCwd: string
): Array<string> => files.map((file) => (isAbsolute(file) ? file : resolve(invocationCwd, file)))

export class FormatCommand extends BaseCommand {
  static override paths = [['format']]

  files: Array<string> = Option.Rest({ required: 0 })

  async execute(): Promise<number> {
    const { executionCwd, invocationCwd, project } = await resolveWorkspaceInvocation(
      this.context.cwd,
      this.context.plugins
    )

    const formatter = await Formatter.initialize(toNativeCwd(executionCwd))
    const files = resolveFormatTargetFiles(this.files, toNativeCwd(invocationCwd))

    const { clear } = render(
      <FormatProgress cwd={toNativeCwd(project.cwd)} formatter={formatter} />
    )

    try {
      await formatter.format(files)

      return 0
    } catch (error) {
      if (error instanceof Error) {
        renderStatic(<ErrorInfo error={error} />)
          .split('\n')
          .forEach((line) => {
            console.log(line) // eslint-disable-line no-console
          })
      } else {
        console.error(error) // eslint-disable-line no-console
      }

      return 1
    } finally {
      clear()
    }
  }
}
