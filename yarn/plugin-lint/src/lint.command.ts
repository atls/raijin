import { BaseCommand } from '@yarnpkg/cli'
import { Command }     from 'clipanion'

class LintCommand extends BaseCommand {
  @Command.Rest({ required: 0 })
  args: Array<string> = []

  @Command.Path(`lint`)
  async execute() {
    await this.cli.run(['actl', 'lint', ...this.args])
  }
}

export { LintCommand }
