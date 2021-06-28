import { BaseCommand } from '@yarnpkg/cli'
import { Option }      from 'clipanion'

class FormatCommand extends BaseCommand {
  static paths = [['format']]

  args: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    await this.cli.run(['actl', 'format', ...this.args])
  }
}

export { FormatCommand }
