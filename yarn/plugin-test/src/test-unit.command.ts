import { BaseCommand } from '@yarnpkg/cli'
import { Command }     from 'clipanion'

class TestUnitCommand extends BaseCommand {
  @Command.Rest({ required: 0 })
  args: Array<string> = []

  @Command.Path('test', 'unit')
  async execute() {
    await this.cli.run(['actl', 'test:unit', ...this.args])
  }
}

export { TestUnitCommand }
