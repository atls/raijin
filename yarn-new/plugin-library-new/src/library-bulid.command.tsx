import { access }               from 'node:fs/promises'
import { join }                 from 'node:path'

import { BaseCommand }          from '@yarnpkg/cli'
import { Configuration }        from '@yarnpkg/core'
import { StreamReport }         from '@yarnpkg/core'
import { MessageName }          from '@yarnpkg/core'

import React                    from 'react'
import { rimrafSync }                   from 'rimraf'
import { Option }               from 'clipanion'

import { ErrorInfo }            from '@atls/cli-ui-error-info-component-new'
import { TypeScriptDiagnostic } from '@atls/cli-ui-typescript-diagnostic-component-new'
import { TypeScriptWorker }     from '@atls/code-typescript-worker-new'
import { SpinnerProgress }      from '@atls/yarn-run-utils-new'
import { renderStatic }         from '@atls/cli-ui-renderer-new'

class LibraryBuildCommand extends BaseCommand {
  static paths = [['library', 'build']]

  target = Option.String('-t,--target', './dist')

  async execute() {
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

            const diagnostics = await ts.build([join(this.context.cwd, './src')], {
              outDir: join(this.context.cwd, this.target),
              module: 'commonjs' as any,
              declaration: true,
            })

            progress.end()

            diagnostics.forEach((diagnostic) => {
              // @ts-ignore
              const output = renderStatic(<TypeScriptDiagnostic {...diagnostic} />)

              output.split('\n').forEach((line) => report.reportError(MessageName.UNNAMED, line))
            })
          } catch (error) {
            progress.end()

            // @ts-ignore
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

  protected async cleanTarget() {
    try {
      await access(this.target)

      rimrafSync(this.target)
      // eslint-disable-next-line no-empty
    } catch {}
  }
}

export { LibraryBuildCommand }
