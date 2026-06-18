import { BaseCommand }                   from '@yarnpkg/cli'
import { Configuration }                 from '@yarnpkg/core'
import { Command }                       from 'clipanion'

import { findPackageCwd }                from './set-version.utils.js'
import { portableToNativePath }          from './set-version.utils.js'
import { preparePackageProjectBoundary } from './set-version.utils.js'

export class SetVersionCommand extends BaseCommand {
  static paths = [['set', 'version', 'atls']]

  static usage = Command.Usage({
    description: 'lock the Yarn version used by the project',
    details: `
    This command will get latest Atlantis bundle from [Atlantis Raijin repo](https://github.com/atls/raijin) and bump \`@atls/code-runtime\` dependency
    `,
  })

  async execute(): Promise<number> {
    const cwd = await findPackageCwd(this.context.cwd)
    const previousCwd = process.cwd()

    await preparePackageProjectBoundary(cwd)

    try {
      process.chdir(portableToNativePath(cwd))

      const args = ['set', 'version']
      args.push('https://raw.githubusercontent.com/atls/raijin/master/.yarn/releases/yarn.mjs')
      const exitCode = await this.cli.run(args, { cwd: cwd as typeof this.context.cwd })

      const bumpArgs = ['up', '@atls/code-runtime']
      const bumpExitCode = await this.cli.run(bumpArgs, { cwd: cwd as typeof this.context.cwd })

      const configuration = await Configuration.find(
        cwd as typeof this.context.cwd,
        this.context.plugins
      )

      await configuration.triggerHook(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
        (hooks) => (hooks as any).afterYarnVersionSet,
        configuration,
        {
          ...this.context,
          cwd: cwd as typeof this.context.cwd,
        }
      )

      return exitCode || bumpExitCode
    } finally {
      process.chdir(previousCwd)
    }
  }
}
