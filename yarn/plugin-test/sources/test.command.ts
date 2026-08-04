import type { WorkspaceInvocation } from '@atls/raijin/commands'

import { BaseCommand }              from '@yarnpkg/cli'

import { Tester }                   from '@atls/code-test'
import { defineCommandInvocation }  from '@atls/raijin/commands'
import { toNativeCwd }              from '@atls/raijin/commands'

import { AbstractTestCommand }      from './abstract-test.command.jsx'

export class TestCommand extends AbstractTestCommand {
  static override paths = [['test']]

  static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

  static override usage = BaseCommand.Usage({
    description: 'run all workspace tests',
  })

  override async execute(invocation?: WorkspaceInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

    const { executionCwd, invocationCwd, project } = invocation

    const tester = await Tester.initialize(toNativeCwd(executionCwd), {
      projectCwd: toNativeCwd(project.cwd),
    })
    const input = this.createInput(invocationCwd)

    try {
      const results = await tester.general(input, {
        watch: this.watch,
        testReporter: this.testReporter,
      })

      return results.some((result) => result.type === 'test:fail') ? 1 : 0
    } catch (error) {
      console.error(error) // eslint-disable-line no-console

      return 1
    }
  }
}
