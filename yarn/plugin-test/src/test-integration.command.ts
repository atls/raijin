import { BaseCommand } from '@yarnpkg/cli'
import { Command }     from 'clipanion'

class TestIntegrationCommand extends BaseCommand {
  @Command.Rest({ required: 0 })
  args: Array<string> = []

  @Command.Path('test', 'integration')
  async execute() {
    await this.cli.run(['actl', 'test:integration', ...this.args])
  }
}

export { TestIntegrationCommand }
