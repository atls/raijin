import { shouldExecuteCommandProxy } from '@atls/raijin/commands'

import { AbstractTestCommand }       from './abstract-test.command.jsx'

export class TestIntegrationCommand extends AbstractTestCommand {
  static override paths = [['test', 'integration']]

  override async execute(): Promise<number> {
    if (shouldExecuteCommandProxy()) {
      return this.executeProxy('integration')
    }

    return this.executeRegular('integration')
  }
}
