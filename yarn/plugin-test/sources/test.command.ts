import { BaseCommand }                from '@yarnpkg/cli'

import { Tester }                     from '@atls/code-test'
import { resolveWorkspaceInvocation } from '@atls/raijin/commands'
import { shouldProxyCommand }         from '@atls/raijin/commands'
import { toNativeCwd }                from '@atls/raijin/commands'

import { AbstractTestCommand }        from './abstract-test.command.jsx'

export class TestCommand extends AbstractTestCommand {
  static override paths = [['test']]

  static override usage = BaseCommand.Usage({
    description: 'run all workspace tests',
  })

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  override async executeRegular(): Promise<number> {
    const { executionCwd, invocationCwd, project } = await resolveWorkspaceInvocation(
      this.context.cwd,
      this.context.plugins
    )

    const tester = await Tester.initialize(toNativeCwd(executionCwd), {
      projectCwd: toNativeCwd(project.cwd),
    })
    const input = this.createInput(invocationCwd, project.cwd)

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
