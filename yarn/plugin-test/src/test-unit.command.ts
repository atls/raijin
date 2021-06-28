import { BaseCommand } from '@yarnpkg/cli'
import { Option }      from 'clipanion'

class TestUnitCommand extends BaseCommand {
  static paths = [['test', 'unit']]

  args: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    await this.cli.run(['actl', 'test:unit', ...this.args])
  }
}

export { TestUnitCommand }
