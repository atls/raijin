import { BaseCommand }                   from '@yarnpkg/cli'
import { Configuration }                 from '@yarnpkg/core'
import { Project }                       from '@yarnpkg/core'
import { Filename }                      from '@yarnpkg/fslib'
import { execUtils }                     from '@yarnpkg/core'
import { xfs }                           from '@yarnpkg/fslib'
import { Command }                       from 'clipanion'

import { createCommandProxyEnvironment } from '../../command-context.js'
import { makeCurrentYarnExecutable }     from '../../current-yarn-executable.js'

export abstract class AbstractRaijinSyncCommand extends BaseCommand {
  static override usage = Command.Usage({
    description: 'Update Raijin project support files',
    details: `
    Update Raijin project support files such as \`tsconfig\` and \`typescript\` version
    `,
    examples: [
      ['Update tsconfig', 'yarn raijin sync tsconfig'],
      ['Update runtime', 'yarn install'],
      ['Update typescript version', 'yarn raijin sync typescript'],
      [`Update all`, 'yarn raijin sync'],
    ],
  })

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular()
    }

    if (process.env.COMMAND_PROXY_EXECUTION === 'true') {
      return this.executeRegular()
    }

    return this.executeProxy()
  }

  async executeProxy(command: Array<string> = ['raijin', 'sync']): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const binFolder = await xfs.mktempPromise()
    const { executable, env } = await makeCurrentYarnExecutable({
      binFolder,
      project,
      env: createCommandProxyEnvironment(this.context.cwd),
    })

    const { code } = await execUtils.pipevp(executable, command, {
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env,
    })

    return code
  }

  async executeRegular(): Promise<number> {
    return 0
  }
}
