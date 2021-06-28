import { BaseCommand } from '@yarnpkg/cli'
import { Option }      from 'clipanion'

class LintCommand extends BaseCommand {
  static paths = [['lint']]

  args: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    await this.cli.run(['actl', 'lint', ...this.args])
  }
}

export { LintCommand }
