import { Tester }              from '@atls/code-test'
import { toNativeCwd }         from '@atls/raijin/commands'

import { AbstractTestCommand } from './abstract-test.command.jsx'

export class TestCommand extends AbstractTestCommand {
  static override paths = [['test']]

  static override usage = AbstractTestCommand.Usage({
    description: 'run all workspace tests',
  })

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { executionCwd, invocationCwd, project } = invocation

    const tester = await Tester.initialize(toNativeCwd(executionCwd), {
      projectCwd: toNativeCwd(project.cwd),
    })
    const input = this.createInput(invocationCwd)

    try {
      const results = await tester.general(input, this.createTestOptions())

      return results.some((result) => result.type === 'test:fail') ? 1 : 0
    } catch (error) {
      console.error(error) // eslint-disable-line no-console

      return 1
    }
  }
}
