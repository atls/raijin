import type { ProjectInvocation } from '@atls/raijin/commands'

import { Option }                 from 'clipanion'

import { RaijinCommand }          from '@atls/raijin/commands'
import { createCommandInput }     from '@atls/raijin/commands'
import { toCommandArguments }     from '@atls/raijin/commands'

export class CheckCommand extends RaijinCommand {
  static override paths = [['check']]

  static override usage = RaijinCommand.Usage({
    description: 'run formatting, type checking, and linting',
  })

  targets: Array<string> = Option.Rest({ required: 0 })

  async executeProject(invocation: ProjectInvocation): Promise<number> {
    let exitCode = 0
    const cwd = invocation.invocationCwd
    const input = createCommandInput({ cwd, source: 'explicit', targets: this.targets })
    const targets = toCommandArguments(input, cwd)

    for await (const command of ['format', 'typecheck', 'lint']) {
      const commandExitCode = await invocation.yarn.execute([command, ...targets])

      if (commandExitCode) {
        exitCode = commandExitCode
      }
    }

    return exitCode
  }
}
