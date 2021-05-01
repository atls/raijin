import { BaseCommand } from '@yarnpkg/cli'
import { Command }     from 'clipanion'

class FormatCommand extends BaseCommand {
  @Command.Rest({ required: 0 })
  args: Array<string> = []

  @Command.Path('format')
  async execute() {
    await this.cli.run(['actl', 'format', ...this.args])
  }
}

export { FormatCommand }
