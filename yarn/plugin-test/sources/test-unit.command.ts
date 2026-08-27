import { AbstractTestCommand } from './abstract-test.command.js'

export class TestUnitCommand extends AbstractTestCommand {
  static override paths = [['test', 'unit']]

  static override usage = AbstractTestCommand.Usage({
    description: 'run unit tests',
  })

  override async execute(): Promise<number> {
    return this.executeScenario('unit', this.context.invocation)
  }
}
