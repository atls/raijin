import type { WorkspaceInvocation } from '@atls/raijin/commands'

import { AbstractTestCommand }      from './abstract-test.command.jsx'

export class TestIntegrationCommand extends AbstractTestCommand {
  static override paths = [['test', 'integration']]

  static override usage = AbstractTestCommand.Usage({
    description: 'run integration tests',
  })

  async executeWorkspace(invocation: WorkspaceInvocation): Promise<number> {
    return this.executeRegular('integration', invocation)
  }
}
