import { Filename }            from '@yarnpkg/fslib'

import { AbstractTestCommand } from './abstract-test.command.jsx'

export class TestIntegrationCommand extends AbstractTestCommand {
  static override paths = [['test', 'integration']]

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular('integration')
    }

    return this.executeProxy('integration')
  }
}
