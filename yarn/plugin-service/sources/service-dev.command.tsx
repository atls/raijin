import { render }                   from 'ink'
import React                        from 'react'

import { ServiceProgress }          from '@atls/cli-ui-service-progress-component'
import { Service }                  from '@atls/code-service'
import { toNativeCwd }              from '@atls/raijin/commands'

import { AbstractServiceCommand }   from './abstract-service.command.jsx'
import { getWorkspacePackageNames } from './workspace-package-names.js'

export class ServiceDevCommand extends AbstractServiceCommand {
  static override paths = [['service', 'dev']]

  static override usage = AbstractServiceCommand.Usage({
    description: 'run a service in development mode',
  })

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { executionCwd, workspace } = invocation
    const service = await Service.initialize(
      toNativeCwd(executionCwd),
      invocation.process,
      getWorkspacePackageNames(workspace)
    )

    const { clear } = render(<ServiceProgress service={service} />)

    try {
      await service.watch((logRecord) => {
        this.renderLogRecord(logRecord)
      })

      return 0
    } catch (error) {
      console.error(error) // eslint-disable-line no-console

      return 1
    } finally {
      clear()
    }
  }
}
