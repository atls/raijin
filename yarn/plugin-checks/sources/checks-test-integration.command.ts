import { AbstractChecksTestCommand } from './abstract-checks-test.command.js'

class ChecksTestIntegrationCommand extends AbstractChecksTestCommand {
  static override paths = [['checks', 'test', 'integration']]

  static override usage = AbstractChecksTestCommand.Usage({
    description: 'report integration test results to GitHub Checks',
  })

  override async execute(): Promise<number> {
    return this.executeTestCheck('integration', 'Test:Integration')
  }
}

export { ChecksTestIntegrationCommand }
