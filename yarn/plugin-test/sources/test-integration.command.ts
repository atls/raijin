import type { WorkspaceInvocation } from '@atls/raijin/commands'

import { BaseCommand }              from '@yarnpkg/cli'

import { defineCommandInvocation }  from '@atls/raijin/commands'

import { AbstractTestCommand }      from './abstract-test.command.jsx'

export class TestIntegrationCommand extends AbstractTestCommand {
  static override paths = [['test', 'integration']]

  static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

  static override usage = BaseCommand.Usage({
    description: 'run integration tests',
  })

  override async execute(invocation?: WorkspaceInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

    return this.executeRegular('integration', invocation)
  }
}
