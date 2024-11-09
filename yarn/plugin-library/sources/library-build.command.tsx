import { rm }                   from 'node:fs/promises'
import { join }                 from 'node:path'

import { BaseCommand }          from '@yarnpkg/cli'
import { Configuration }        from '@yarnpkg/core'
import { StreamReport }         from '@yarnpkg/core'
import { MessageName }          from '@yarnpkg/core'
import { Option }               from 'clipanion'
import { isEnum }               from 'typanion'
import React                    from 'react'

import { ErrorInfo }            from '@atls/cli-ui-error-info-component'
import { TypeScriptDiagnostic } from '@atls/cli-ui-typescript-diagnostic-component'
import { SpinnerProgress }      from '@atls/yarn-run-utils'
import { renderStatic }         from '@atls/cli-ui-renderer'

class LibraryBuildCommand extends BaseCommand {
  static paths = [['library', 'build']]

  target = Option.String('-t,--target', './dist')

  module: any = Option.String('-m,--module', 'nodenext', {
    validator: isEnum(['nodenext', 'commonjs']),
  })

  async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await this.cleanTarget()

        await report.startTimerPromise('Library Build', async () => {
          const progress = new SpinnerProgress(this.context.stdout, configuration)

          progress.start()

          try {
            const ts = new TypeScriptWorker(configuration.projectCwd!)

            const diagnostics = await ts.build(
              this.context.cwd,
              [join(this.context.cwd, './src')],
              {
                outDir: join(this.context.cwd, this.target),
                module: this.module,
                declaration: true,
              }
            )

            progress.end()

            diagnostics.forEach((diagnostic) => {
              const output = renderStatic(<TypeScriptDiagnostic {...diagnostic} />)

              output.split('\n').forEach((line) => report.reportError(MessageName.UNNAMED, line))
            })
          } catch (error) {
            progress.end()

            renderStatic(<ErrorInfo error={error as Error} />, process.stdout.columns - 12)
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

  protected async cleanTarget(): Promise<void> {
    try {
      await rm(this.target, { recursive: true, force: true })
      // eslint-disable-next-line no-empty
    } catch {}
  }
}

export { LibraryBuildCommand }
