import { render }                   from 'ink'
import React                        from 'react'

import { toNativeCwd }              from '@atls/raijin/commands'

import { AbstractServiceCommand }   from '../commands/base.jsx'
import { ServiceProgress }          from './progress.jsx'
import { writeError }               from '../logging/write.jsx'
import { getWorkspacePackageNames } from '../workspace/package-names.js'
import { runDevelopmentSession }    from './session.js'
import { createTerminationSignal }  from './termination.js'

export class ServiceDevCommand extends AbstractServiceCommand {
  static override paths = [['service', 'dev']]

  static override usage = AbstractServiceCommand.Usage({
    description: 'run a service in development mode',
  })

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { executionCwd, workspace } = invocation
    const progress = render(<ServiceProgress message='Preparing compilation' percent={0} />, {
      exitOnCtrlC: false,
      patchConsole: false,
    })
    const termination = createTerminationSignal()

    try {
      const result = await runDevelopmentSession({
        application: invocation.application,
        cwd: toNativeCwd(executionCwd),
        onDiagnostics: (diagnostics) => {
          diagnostics.forEach((diagnostic) => {
            this.renderLogRecord(diagnostic)
          })
        },
        onLogRecord: (record) => {
          this.renderLogRecord(record)
        },
        onProgress: ({ message, percent }) => {
          progress.rerender(<ServiceProgress message={message} percent={percent} />)
        },
        signal: termination.signal,
        workspacePackageNames: getWorkspacePackageNames(workspace),
      })

      if (result.status === 'cancelled') {
        return termination.exitCode()
      }

      if (result.status === 'provider-failed') {
        writeError(this.context, result.error)
      } else {
        writeError(this.context, new Error(`Application failed with ${result.execution.reason}`))
      }

      return 1
    } catch (error) {
      writeError(this.context, error)

      return 1
    } finally {
      termination.dispose()
      progress.clear()
      progress.unmount()
    }
  }
}
