import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'
import { BaseCommand }   from '@yarnpkg/cli'
import { StreamReport }  from '@yarnpkg/core'
import { structUtils }   from '@yarnpkg/core'
import semver            from 'semver'

import runtime           from '@atls/code-runtime/package.json' assert { type: 'json' }

export class ToolsSyncTypeScriptCommand extends BaseCommand {
  static paths = [['tools', 'sync', 'typescript']]

  async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Tools sync typescript version', async () => {
          if (project.topLevelWorkspace.manifest.raw.devDependencies) {
            const ident = structUtils.parseIdent('typescript')

            let descriptor = Array.from(
              project.topLevelWorkspace.manifest.devDependencies.values()
            ).find((target) => target.scope === ident.scope && target.name === ident.name)

            if (!descriptor) {
              descriptor = structUtils.makeDescriptor(ident, runtime.dependencies.typescript)
            }

            if (
              semver.valid(semver.coerce(descriptor.range)) &&
              semver.valid(semver.coerce(runtime.dependencies.typescript))
            ) {
              if (
                !semver.eq(
                  semver.coerce(descriptor.range)!,
                  semver.coerce(runtime.dependencies.typescript)!
                )
              ) {
                descriptor.range = runtime.dependencies.typescript
              }
            }

            project.topLevelWorkspace.manifest.devDependencies.set(descriptor.identHash, descriptor)

            await project.persist()
          }
        })
      }
    )

    return commandReport.exitCode()
  }
}
