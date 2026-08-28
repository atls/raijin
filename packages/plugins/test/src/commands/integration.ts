import { AbstractTestCommand } from './base.js'

export class TestIntegrationCommand extends AbstractTestCommand {
  static override paths = [['test', 'integration']]

  static override usage = AbstractTestCommand.Usage({
    description: 'run integration tests',
  })

  override async execute(): Promise<number> {
    return this.executeScenario('integration', this.context.invocation)
  }
}
