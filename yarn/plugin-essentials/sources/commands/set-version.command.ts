import { BaseCommand }                       from '@yarnpkg/cli'
import { Configuration }                     from '@yarnpkg/core'
import { Command }                           from 'clipanion'

import { cleanupObsoleteRaijinRuntimeFiles } from './set-version.migration.js'
import { assertInstalledRaijinRuntime }      from './set-version.runtime.js'
import { fetchRaijinRuntimeManifest }        from './set-version.runtime.js'
import { installRaijinRuntime }              from './set-version.runtime.js'
import { findPackageCwd }                    from './set-version.utils.js'
import { normalizePackageManager }           from './set-version.utils.js'
import { portableToNativePath }              from './set-version.utils.js'
import { preparePackageProjectBoundary }     from './set-version.utils.js'

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
      await cleanupObsoleteRaijinRuntimeFiles(cwd)

      const bumpArgs = ['up', '@atls/code-runtime']
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
