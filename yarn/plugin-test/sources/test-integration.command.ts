import { AbstractTestCommand } from './abstract-test.command.jsx'

export class TestIntegrationCommand extends AbstractTestCommand {
  static override paths = [['test', 'integration']]

  static override usage = AbstractTestCommand.Usage({
    description: 'run integration tests',
  })

  override async execute(): Promise<number> {
    return this.executeRegular('integration', this.context.invocation)
  }
}
