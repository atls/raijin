import { Filename }                       from '@yarnpkg/fslib'

import { Tester }                         from '@atls/code-test'
import { COMMAND_PROXY_EXECUTION }        from '@atls/yarn-plugin-tools/command-context'
import { resolveWorkspaceCommandContext } from '@atls/yarn-plugin-tools/command-context'

import { AbstractTestCommand }            from './abstract-test.command.jsx'

export class TestCommand extends AbstractTestCommand {
  static override paths = [['test']]

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular()
    }

    if (process.env[COMMAND_PROXY_EXECUTION] === 'true') {
      return this.executeRegular()
    }

    return this.executeProxy()
  }

  override async executeRegular(): Promise<number> {
    const { project, invocationCwd, workspaceCwd } = await resolveWorkspaceCommandContext(
      this.context.cwd,
      this.context.plugins
    )

    const tester = await Tester.initialize(workspaceCwd, { projectCwd: project.cwd })
    const target = this.target ?? (this.files.length > 0 ? invocationCwd : project.cwd)

    try {
      const results = await tester.general(target, {
        files: this.files,
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
