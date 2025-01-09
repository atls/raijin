import { BaseCommand }   from '@yarnpkg/cli'
import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'
import { Filename }      from '@yarnpkg/fslib'
import { scriptUtils }   from '@yarnpkg/core'
import { execUtils }     from '@yarnpkg/core'
import { xfs }           from '@yarnpkg/fslib'
import { Command }       from 'clipanion'

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
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular()
    }

    return this.executeProxy()
  }

  async executeProxy(command: Array<string> = ['tools', 'sync']): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const binFolder = await xfs.mktempPromise()

    const { code } = await execUtils.pipevp('yarn', command, {
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env: await scriptUtils.makeScriptEnv({ binFolder, project }),
    })

    return code
  }

  async executeRegular(): Promise<number> {
    return 0
  }
}
