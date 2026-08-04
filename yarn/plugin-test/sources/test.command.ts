import type { WorkspaceInvocation } from '@atls/raijin/commands'

import { Tester }                   from '@atls/code-test'
import { toNativeCwd }              from '@atls/raijin/commands'

import { AbstractTestCommand }      from './abstract-test.command.jsx'

export class TestCommand extends AbstractTestCommand {
  static override paths = [['test']]

  static override usage = AbstractTestCommand.Usage({
    description: 'run all workspace tests',
  })

  async executeWorkspace(invocation: WorkspaceInvocation): Promise<number> {
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
