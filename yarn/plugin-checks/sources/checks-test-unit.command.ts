import { AbstractChecksTestCommand } from './abstract-checks-test.command.js'

export class ChecksTestUnitCommand extends AbstractChecksTestCommand {
  static override paths = [['checks', 'test', 'unit']]

  static override usage = AbstractChecksTestCommand.Usage({
    description: 'report unit test results to GitHub Checks',
  })

  override async execute(): Promise<number> {
    return this.executeTestCheck('unit', 'Test:Unit')
  }
}
