import type { ProjectInvocation }  from '@atls/raijin/commands'

import { BaseCommand }             from '@yarnpkg/cli'
import { Option }                  from 'clipanion'

import { createCommandInput }      from '@atls/raijin/commands'
import { defineCommandInvocation } from '@atls/raijin/commands'
import { toCommandArguments }      from '@atls/raijin/commands'

export class CheckCommand extends BaseCommand {
  static override paths = [['check']]

  static raijinCommand = defineCommandInvocation({ scope: 'project' })

  static override usage = BaseCommand.Usage({
    description: 'run formatting, type checking, and linting',
  })

  targets: Array<string> = Option.Rest({ required: 0 })

  async execute(invocation?: ProjectInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

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
