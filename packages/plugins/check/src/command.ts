import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'

import { createCommandInput }           from '@atls/raijin/commands'
import { toCommandArguments }           from '@atls/raijin/commands'

export class CheckCommand extends BaseCommand {
  static override paths = [['check']]

  static override usage = BaseCommand.Usage({
    description: 'run formatting, type checking, and linting',
  })

  declare context: WorkspaceCommandContext

  targets: Array<string> = Option.Rest({ required: 0 })

  override async execute(): Promise<number> {
    const { invocation } = this.context
    let exitCode = 0
    const requestedTargets = this.targets.length > 0 ? this.targets : [invocation.invocationCwd]
    const input = createCommandInput({
      cwd: invocation.invocationCwd,
      source: 'explicit',
      targets: requestedTargets,
    })
    const targets = toCommandArguments(input, invocation.executionCwd)

    for await (const command of ['format', 'typecheck', 'lint']) {
      const commandExitCode = await invocation.yarn.execute([command, ...targets])

      if (commandExitCode) {
        exitCode = commandExitCode
      }
    }

    return exitCode
  }
}
