/* eslint-disable */

import { BaseCommand }     from '@yarnpkg/cli'
import { Configuration }   from '@yarnpkg/core'
import { Project }         from '@yarnpkg/core'
import { MessageName }     from '@yarnpkg/core'
import { StreamReport }    from '@yarnpkg/core'
import { xfs }             from '@yarnpkg/fslib'
import { npath }           from '@yarnpkg/fslib'
import React               from 'react'

import { SpinnerProgress } from '@atls/yarn-run-utils'
import { renderStatic }    from '@atls/cli-ui-renderer-static-component'

// TODO: refactor
class MigrationUpCommand extends BaseCommand {
  static paths = [['migration', 'up']]

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project, workspace } = await Project.find(configuration, this.context.cwd)

    const schematics = 'bla' as any
    // const schematics = new SchematicsWorker(project.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Run Migrations', async () => {
          const progress = new SpinnerProgress(this.context.stdout, configuration)

          progress.start()

          try {
            const events = await schematics.migrate(
              'project',
              workspace?.manifest?.raw?.tools?.schematic?.migration || '0'
            )

            progress.end()

            events.forEach((event: any) => {
              const eventPath = event.path.startsWith('/') ? event.path.slice(1) : event.path

              if (event.kind === 'error') {
                report.reportError(MessageName.UNNAMED, `${eventPath}: ${event.description}`)
              } else {
                report.reportInfo(MessageName.UNNAMED, `${eventPath}: ${event.kind}`)
              }
            })

            await xfs.writeJsonPromise(
              npath.toPortablePath(
                npath.join(npath.fromPortablePath(workspace!.cwd), 'package.json')
              ),
              {
                ...workspace?.manifest.raw,
                tools: {
                  ...workspace?.manifest.raw.tools,
                  schematic: {
                    ...workspace?.manifest.raw.tools.schematic,
                    migration: String(Date.now()),
                  },
                },
              }
            )
          } catch (error) {
            progress.end()

            // renderStatic(<ErrorInfo error={error as Error} />, process.stdout.columns - 12)
            renderStatic(
              <>PLUGIN SCHEMATICS ERROR INFO</>,
              // @ts-expect-error expected 1 argument, but got 2
              process.stdout.columns - 12
            )
              .split('\n')
              .forEach((line) => {
                report.reportError(MessageName.UNNAMED, line)
              })
          }
        })
      }
    )

    return commandReport.exitCode()
  }
}

export { MigrationUpCommand }
