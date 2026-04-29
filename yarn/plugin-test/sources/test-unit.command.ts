import { executeYarnPnpProxy } from '@atls/yarn-run-utils'

import { AbstractTestCommand } from './abstract-test.command.jsx'

export class TestUnitCommand extends AbstractTestCommand {
  static override paths = [['test', 'unit']]

  override async execute(): Promise<number> {
    return executeYarnPnpProxy({
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      executeRegular: async () => this.executeRegular('unit'),
      executeProxy: async () => this.executeProxy('unit'),
    })
  }
}
