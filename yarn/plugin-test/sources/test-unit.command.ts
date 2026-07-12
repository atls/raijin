import { shouldExecuteCommandProxy } from '@atls/raijin/commands'

import { AbstractTestCommand }       from './abstract-test.command.jsx'

export class TestUnitCommand extends AbstractTestCommand {
  static override paths = [['test', 'unit']]

  override async execute(): Promise<number> {
    if (shouldExecuteCommandProxy()) {
      return this.executeProxy('unit')
    }

    return this.executeRegular('unit')
  }
}
