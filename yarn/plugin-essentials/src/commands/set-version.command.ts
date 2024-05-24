import { BaseCommand }                                from '@yarnpkg/cli'
import { Configuration }                              from '@yarnpkg/core'
import { SetVersionCommand as BaseSetVersionCommand } from '@yarnpkg/plugin-essentials'
import { Option }                                     from 'clipanion'

export class SetVersionCommand extends BaseCommand {
  static paths = [['set', 'version']]

  static usage = BaseSetVersionCommand.usage

  useYarnPath = Option.Boolean(`--yarn-path`, {
    description: `Set the yarnPath setting even if the version can be accessed by Corepack`,
  })

  onlyIfNeeded = Option.Boolean(`--only-if-needed`, false, {
    description: `Only lock the Yarn version if it isn't already locked`,
  })

  version = Option.String()

  async execute(): Promise<number> {
    const args = ['set', 'version', 'original']

    if (this.useYarnPath === true) {
      args.push('--yarn-path')
    }

    if (this.onlyIfNeeded) {
      args.push('--only-if-needed')
    }

    args.push(this.version)

    const exitCode = await this.cli.run(args)

    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    await configuration.triggerHook(
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      (hooks) => (hooks as any).afterYarnVersionSet,
      configuration,
      this.context
    )

    return exitCode
  }
}
