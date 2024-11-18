import { BaseCommand }   from '@yarnpkg/cli'
import { Configuration } from '@yarnpkg/core'
import { Command }       from 'clipanion'

export class SetVersionCommand extends BaseCommand {
  static paths = [['set', 'version', 'atlantis']]

  static usage = Command.Usage({
    description: 'lock the Yarn version used by the project',
    details: `
    This command will get latest Atlantis bundle from [Atlantis Raijin repo](https://github.com/atls/raijin) and bump \`@atls/code-runtime\` dependency
    `,
  })

  async execute(): Promise<number> {
    const args = ['set', 'version']
    args.push('https://raw.githubusercontent.com/atls/raijin/master/yarn/cli/dist/yarn.mjs')
    const exitCode = await this.cli.run(args)

    const bumpArgs = ['up', '@atls/code-runtime']
    const bumpExitCode = await this.cli.run(bumpArgs)

    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    await configuration.triggerHook(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      (hooks) => (hooks as any).afterYarnVersionSet,
      configuration,
      this.context
    )

    return bumpExitCode && exitCode
  }
}
