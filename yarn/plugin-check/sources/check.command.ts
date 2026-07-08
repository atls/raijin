import { BaseCommand } from '@yarnpkg/cli'
import { Option }      from 'clipanion'

export class CheckCommand extends BaseCommand {
  static override paths = [['check']]

  targets: Array<string> = Option.Rest({ required: 0 })

  async execute(): Promise<number> {
    let exitCode = 0

    for await (const command of ['format', 'typecheck', 'lint']) {
      const commandExitCode = await this.cli.run([command, ...this.targets])

      if (commandExitCode) {
        exitCode = commandExitCode
      }
    }

    return exitCode
  }
}
