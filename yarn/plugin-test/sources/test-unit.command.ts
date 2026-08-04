import type { WorkspaceInvocation } from '@atls/raijin/commands'

import { BaseCommand }              from '@yarnpkg/cli'

import { defineCommandInvocation }  from '@atls/raijin/commands'

import { AbstractTestCommand }      from './abstract-test.command.jsx'

export class TestUnitCommand extends AbstractTestCommand {
  static override paths = [['test', 'unit']]

  static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

  static override usage = BaseCommand.Usage({
    description: 'run unit tests',
  })

  override async execute(invocation?: WorkspaceInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

    return this.executeRegular('unit', invocation)
  }
}
