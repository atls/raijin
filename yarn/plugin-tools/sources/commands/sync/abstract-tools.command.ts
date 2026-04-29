import { BaseCommand }         from '@yarnpkg/cli'
import { Configuration }       from '@yarnpkg/core'
import { Project }             from '@yarnpkg/core'
import { scriptUtils }         from '@yarnpkg/core'
import { xfs }                 from '@yarnpkg/fslib'
import { Command }             from 'clipanion'

import { executeYarnPnpProxy } from '@atls/yarn-run-utils'
import { pipeYarnPnpProxy }    from '@atls/yarn-run-utils'

export abstract class AbstractToolsCommand extends BaseCommand {
  static override usage = Command.Usage({
    description: 'Update tools',
    details: `
    Update tools such as \`tsconfig\`, \`typescript\` version, \`@atls/code-runtime\` version
    `,
    examples: [
      ['Update tsconfig', 'yarn tools tsconfig'],
      ['Update runtime', 'yarn tools runtime'],
      ['Update typescript version', 'yarn tools typescript'],
      [`Update all`, 'yarn tools sync'],
    ],
  })

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

  async executeProxy(command: Array<string> = ['tools', 'sync']): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const binFolder = await xfs.mktempPromise()

    return pipeYarnPnpProxy({
      args: command,
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env: {
        ...(await scriptUtils.makeScriptEnv({ binFolder, project, ignoreCorepack: true })),
        COMMAND_PROXY_EXECUTION: 'true',
      },
    })
  }

  async executeRegular(): Promise<number> {
    return 0
  }
}
