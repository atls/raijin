import { executeYarnPnpProxy } from '@atls/yarn-run-utils'

import { AbstractTestCommand } from './abstract-test.command.jsx'

export class TestIntegrationCommand extends AbstractTestCommand {
  static override paths = [['test', 'integration']]

  override async execute(): Promise<number> {
    return executeYarnPnpProxy({
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      executeRegular: async () => this.executeRegular('integration'),
      executeProxy: async () => this.executeProxy('integration'),
    })
  }
}
