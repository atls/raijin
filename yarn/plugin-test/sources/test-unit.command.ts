import type { WorkspaceInvocation } from '@atls/raijin/commands'

import { AbstractTestCommand }      from './abstract-test.command.jsx'

export class TestUnitCommand extends AbstractTestCommand {
  static override paths = [['test', 'unit']]

  static override usage = AbstractTestCommand.Usage({
    description: 'run unit tests',
  })

  async executeWorkspace(invocation: WorkspaceInvocation): Promise<number> {
    return this.executeRegular('unit', invocation)
  }
}
