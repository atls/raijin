import { render }                   from 'ink'
import React                        from 'react'

import { toNativeCwd }              from '@atls/raijin/commands'

import { AbstractServiceCommand }   from '../commands/base.jsx'
import { ServiceProgress }          from '../development/progress.jsx'
import { writeError }               from '../logging/write.jsx'
import { getWorkspacePackageNames } from '../workspace/package-names.js'
import { buildProject }             from './run.js'

export class ServiceBuildCommand extends AbstractServiceCommand {
  static override paths = [['service', 'build']]

  static override usage = AbstractServiceCommand.Usage({
    description: 'build a service production artifact',
  })

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { executionCwd, workspace } = invocation
    const progress = render(<ServiceProgress message='Preparing compilation' percent={0} />, {
      exitOnCtrlC: false,
      patchConsole: false,
    })

    try {
      const result = await buildProject({
        cwd: toNativeCwd(executionCwd),
        onProgress: ({ message, percent }) => {
          progress.rerender(<ServiceProgress message={message} percent={percent} />)
        },
        workspacePackageNames: getWorkspacePackageNames(workspace),
      })

      if (result.status === 'provider-failed') {
        writeError(this.context, result.error)

        return 1
      }

      result.diagnostics.forEach((logRecord) => {
        this.renderLogRecord(logRecord)
      })

      return result.status === 'built' ? 0 : 1
    } catch (error) {
      writeError(this.context, error)

      return 1
    } finally {
      progress.clear()
      progress.unmount()
    }
  }
}
