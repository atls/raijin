import { BaseCommand }         from '@yarnpkg/cli'

import { shouldProxyCommand }  from '@atls/raijin/commands'

import { AbstractTestCommand } from './abstract-test.command.jsx'

export class TestIntegrationCommand extends AbstractTestCommand {
  static override paths = [['test', 'integration']]

  static override usage = BaseCommand.Usage({
    description: 'run integration tests',
  })

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy('integration')
    }

    return this.executeRegular('integration')
  }
}
