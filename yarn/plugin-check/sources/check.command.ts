import { BaseCommand }        from '@yarnpkg/cli'
import { Option }             from 'clipanion'

import { createCommandInput } from '@atls/raijin/commands'
import { toCommandArguments } from '@atls/raijin/commands'
import { toPortableCwd }      from '@atls/raijin/commands'

export class CheckCommand extends BaseCommand {
  static override paths = [['check']]

  targets: Array<string> = Option.Rest({ required: 0 })

  async execute(): Promise<number> {
    let exitCode = 0
    const cwd = toPortableCwd(this.context.cwd)
    const input = createCommandInput({ cwd, source: 'explicit', targets: this.targets })
    const targets = toCommandArguments(input, cwd)

    for await (const command of ['format', 'typecheck', 'lint']) {
      const commandExitCode = await this.cli.run([command, ...targets])

      if (commandExitCode) {
        exitCode = commandExitCode
      }
    }

    return exitCode
  }
}
