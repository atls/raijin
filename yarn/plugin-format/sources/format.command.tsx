import { BaseCommand }                from '@yarnpkg/cli'
import { Option }                     from 'clipanion'
import { render }                     from 'ink'
import React                          from 'react'

import { ErrorInfo }                  from '@atls/cli-ui-error-info-component'
import { FormatProgress }             from '@atls/cli-ui-format-progress-component'
import { Formatter }                  from '@atls/code-format'
import { renderStatic }               from '@atls/cli-ui-renderer-static-component'
import { createCommandInput }         from '@atls/raijin/commands'
import { resolveWorkspaceInvocation } from '@atls/raijin/commands'
import { toNativeCwd }                from '@atls/raijin/commands'
import { getWorkspacePackageNames }   from '@atls/raijin/project'

export class FormatCommand extends BaseCommand {
  static override paths = [['format']]

  files: Array<string> = Option.Rest({ required: 0 })

  async execute(): Promise<number> {
    const { executionCwd, invocationCwd, project, yarn } = await resolveWorkspaceInvocation(
      this.context.cwd,
      this.context.plugins
    )

    const formatter = await Formatter.initialize(toNativeCwd(executionCwd), {
      workspacePackageNames: getWorkspacePackageNames(yarn.project),
    })
    const input = createCommandInput({
      cwd: invocationCwd,
      source: 'explicit',
      targets: this.files,
    })

    const { clear } = render(
      <FormatProgress cwd={toNativeCwd(project.cwd)} formatter={formatter} />
    )

    try {
      await formatter.format(input.targets.length > 0 ? input : undefined)

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
