import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import type { FormatCommandOptions }    from './format.command.interfaces.js'
import type { FormatCommandResult }     from './format.command.interfaces.js'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'
import React                            from 'react'

import { ErrorInfo }                    from '@atls/cli-ui-error-info-component'
import { renderStatic }                 from '@atls/cli-ui-renderer-static-component'
import { createCommandInput }           from '@atls/raijin/commands'
import { toNativeCwd }                  from '@atls/raijin/commands'
import { getWorkspacePackageNames }     from '@atls/raijin/project'
import { formatProjectSources }         from '@atls/raijin/project/formatting'

export const runFormatCommand = async (
  options: FormatCommandOptions,
  format: typeof formatProjectSources = formatProjectSources
): Promise<FormatCommandResult> => {
  try {
    return {
      result: await format({
        cwd: options.cwd,
        targets: options.targets.targets.length > 0 ? options.targets : undefined,
        workspacePackageNames: options.workspacePackageNames,
      }),
      status: 'succeeded',
    }
  } catch (error) {
    return { error, status: 'failed' }
  }
}

export class FormatCommand extends BaseCommand {
  static override paths = [['format']]

  static override usage = BaseCommand.Usage({
    description: 'format project files',
  })

  declare context: WorkspaceCommandContext

  files: Array<string> = Option.Rest({ required: 0 })

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { executionCwd, invocationCwd, yarn } = invocation
    const targets = createCommandInput({
      cwd: invocationCwd,
      source: 'explicit',
      targets: this.files,
    })
    const outcome = await runFormatCommand({
      cwd: toNativeCwd(executionCwd),
      targets,
      workspacePackageNames: getWorkspacePackageNames(yarn.project),
    })

    if (outcome.status === 'succeeded') {
      return 0
    }

    if (outcome.error instanceof Error) {
      this.context.stdout.write(`${renderStatic(<ErrorInfo error={outcome.error} />)}\n`)
    } else {
      this.context.stderr.write(`${String(outcome.error)}\n`)
    }

    return 1
  }
}
