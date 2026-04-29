import { Configuration }       from '@yarnpkg/core'
import { Project }             from '@yarnpkg/core'

import { Tester }              from '@atls/code-test'
import { executeYarnPnpProxy } from '@atls/yarn-run-utils'

import { AbstractTestCommand } from './abstract-test.command.jsx'

export class TestCommand extends AbstractTestCommand {
  static override paths = [['test']]

  override async execute(): Promise<number> {
    return executeYarnPnpProxy({
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      executeRegular: async () => this.executeRegular(),
      executeProxy: async () => this.executeProxy(),
    })
  }

  override async executeRegular(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const tester = await Tester.initialize(this.context.cwd)

    try {
      const results = (await tester.general(this.target ?? project.cwd, {
        files: this.files,
        watch: this.watch,
        testReporter: this.testReporter,
      })) as unknown as Array<string>

      return results.some((result) => {
        if (result.includes('# fail ')) {
          const failedNumber = parseInt(result.split('# fail ')[1], 2)

          return failedNumber > 0
        }

        return false
      })
        ? 1
        : 0
    } catch (error) {
      console.error(error) // eslint-disable-line no-console

      return 1
    }
  }
}
