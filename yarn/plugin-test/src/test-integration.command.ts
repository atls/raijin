import { BaseCommand } from '@yarnpkg/cli'
import { Option }      from 'clipanion'

class TestIntegrationCommand extends BaseCommand {
  static paths = [['test', 'integration']]

  args: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    await this.cli.run(['actl', 'test:integration', ...this.args])
  }
}

export { TestIntegrationCommand }
