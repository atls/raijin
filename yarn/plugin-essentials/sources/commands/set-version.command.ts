import { BaseCommand }                   from '@yarnpkg/cli'
import { Configuration }                 from '@yarnpkg/core'
import { Command }                       from 'clipanion'

import { assertInstalledRaijinRuntime }  from './set-version.runtime.js'
import { fetchRaijinRuntimeManifest }    from './set-version.runtime.js'
import { installRaijinRuntime }          from './set-version.runtime.js'
import { findPackageCwd }                from './set-version.utils.js'
import { normalizePackageManager }       from './set-version.utils.js'
import { portableToNativePath }          from './set-version.utils.js'
import { preparePackageProjectBoundary } from './set-version.utils.js'

const RAIJIN_PUBLIC_PACKAGE = '@atls/raijin'

export class SetVersionCommand extends BaseCommand {
  static paths = [['set', 'version', 'atls']]

  static usage = Command.Usage({
    description: 'lock the Yarn version used by the project',
    details: `
    This command will get the latest Atlantis bundle from [Atlantis Raijin repo](https://github.com/atls/raijin) and update the public Raijin package
    `,
  })

  async execute(): Promise<number> {
    const cwd = await findPackageCwd(this.context.cwd)
    const previousCwd = process.cwd()

    await preparePackageProjectBoundary(cwd)

    try {
      process.chdir(portableToNativePath(cwd))

      const configuration = await Configuration.find(
        cwd as typeof this.context.cwd,
        this.context.plugins
      )
      const runtimeManifest = await fetchRaijinRuntimeManifest(configuration)
      await installRaijinRuntime(configuration, cwd, runtimeManifest)
      await normalizePackageManager(cwd, runtimeManifest.packageManager)

      const updatedConfiguration = await Configuration.find(
        cwd as typeof this.context.cwd,
        this.context.plugins
      )

      await assertInstalledRaijinRuntime(updatedConfiguration, cwd, runtimeManifest)

      const bumpArgs = ['up', RAIJIN_PUBLIC_PACKAGE]
      const bumpExitCode = await this.cli.run(bumpArgs, { cwd: cwd as typeof this.context.cwd })

      const finalConfiguration = await Configuration.find(
        cwd as typeof this.context.cwd,
        this.context.plugins
      )

      await finalConfiguration.triggerHook(
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
        (hooks) => (hooks as any).afterYarnVersionSet,
        finalConfiguration,
        {
          ...this.context,
          cwd: cwd as typeof this.context.cwd,
        }
      )

      return bumpExitCode
    } finally {
      process.chdir(previousCwd)
    }
  }
}
