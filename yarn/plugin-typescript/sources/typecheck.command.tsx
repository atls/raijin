import { BaseCommand }          from '@yarnpkg/cli'
import { Configuration }        from '@yarnpkg/core'
import { Project }              from '@yarnpkg/core'
import { StreamReport }         from '@yarnpkg/core'
import { MessageName }          from '@yarnpkg/core'

import React                    from 'react'
import { Option }               from 'clipanion'

import { ErrorInfo }            from '@atls/cli-ui-error-info-component'
import { TypeScriptDiagnostic } from '@atls/cli-ui-typescript-diagnostic-component'
import { TypeScriptWorker }     from '@atls/code-typescript-worker'
import { SpinnerProgress }      from '@atls/yarn-run-utils'
import { renderStatic }         from '@atls/cli-ui-renderer'

class TypeCheckCommand extends BaseCommand {
  static paths = [['typecheck']]

  args: Array<string> = Option.Rest({ required: 0 })

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        await report.startTimerPromise('Typecheck', async () => {
          const progress = new SpinnerProgress(this.context.stdout, configuration)

          progress.start()

          try {
            const ts = new TypeScriptWorker(project.cwd)

            const diagnostics = await ts.check(this.context.cwd,
              this.args.length > 0
                ? this.args
                : project.topLevelWorkspace.manifest.workspaceDefinitions.map(
                    (definition) => definition.pattern
                  )
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
}

export { TypeCheckCommand }
