import { BaseCommand }         from '@yarnpkg/cli'

import { shouldProxyCommand }  from '@atls/raijin/commands'

import { AbstractTestCommand } from './abstract-test.command.jsx'

export class TestUnitCommand extends AbstractTestCommand {
  static override paths = [['test', 'unit']]

  static override usage = BaseCommand.Usage({
    description: 'run unit tests',
  })

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy('unit')
    }

    return this.executeRegular('unit')
  }
}
