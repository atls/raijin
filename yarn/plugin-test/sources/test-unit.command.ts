import { AbstractTestCommand } from './abstract-test.command.jsx'

export class TestUnitCommand extends AbstractTestCommand {
  static override paths = [['test', 'unit']]

  static override usage = AbstractTestCommand.Usage({
    description: 'run unit tests',
  })

  override async execute(): Promise<number> {
    return this.executeRegular('unit', this.context.invocation)
  }
}
