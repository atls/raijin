import { Configuration }        from '@yarnpkg/core'
import { Project }              from '@yarnpkg/core'
import { StreamReport }         from '@yarnpkg/core'
import { structUtils }          from '@yarnpkg/core'
import semver                   from 'semver'

import { executeYarnPnpProxy }  from '@atls/yarn-run-utils'

import { AbstractToolsCommand } from './abstract-tools.command.js'

export class ToolsSyncTypeScriptCommand extends AbstractToolsCommand {
  static override paths = [['tools', 'sync', 'typescript']]

  override async execute(): Promise<number> {
    return executeYarnPnpProxy({
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      executeRegular: async () => this.executeRegular(),
      executeProxy: async () => this.executeProxy(['tools', 'sync', 'typescript']),
    })
  }

  override async executeRegular(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const runtime = (
      await import('@atls/code-runtime/package.json', {
        with: { type: 'json' },
      })
    ).default

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
                  semver.coerce(descriptor.range) || '',
                  semver.coerce(runtime.dependencies.typescript) || ''
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
