import { Configuration }        from '@yarnpkg/core'
import { Project }              from '@yarnpkg/core'
import { StreamReport }         from '@yarnpkg/core'
import { Filename }             from '@yarnpkg/fslib'
import { structUtils }          from '@yarnpkg/core'
import semver                   from 'semver'

import { AbstractToolsCommand } from './abstract-tools.command.js'

export class ToolsSyncTypeScriptCommand extends AbstractToolsCommand {
  static override paths = [['tools', 'sync', 'typescript']]

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular()
    }

    return this.executeProxy(['tools', 'sync', 'typescript'])
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
