import { render }                            from 'ink'
import React                                 from 'react'

import { ErrorInfo }                         from '@atls/cli-ui-error-info-component'
import { ServiceProgress }                   from '@atls/cli-ui-service-progress-component'
import { Service }                           from '@atls/code-service'
import { renderStatic }                      from '@atls/cli-ui-renderer-static-component'
import { executeWorkspaceCommandProxy }      from '@atls/raijin/commands'
import { resolveWorkspaceCommandInvocation } from '@atls/raijin/commands'
import { shouldExecuteCommandProxy }         from '@atls/raijin/commands'

import { AbstractServiceCommand }            from './abstract-service.command.jsx'
import { getWorkspacePackageNames }          from './workspace-package-names.js'

export class ServiceBuildCommand extends AbstractServiceCommand {
  static override paths = [['service', 'build']]

  override async execute(): Promise<number> {
    if (shouldExecuteCommandProxy()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    const args: Array<string> = []

    if (this.showWarnings) {
      args.push('-s')
    }

    return executeWorkspaceCommandProxy({
      args: ['service', 'build', ...args],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const { cwd, workspace } = await resolveWorkspaceCommandInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const service = await Service.initialize(
      cwd.execution.native,
      getWorkspacePackageNames(workspace)
    )

    const { clear } = render(<ServiceProgress service={service} />)

    try {
      const logRecords = await service.build()

      logRecords.forEach((logRecord) => {
        this.renderLogRecord(logRecord)
      })

      return 0
    } catch (error) {
      if (error instanceof Error) {
        renderStatic(<ErrorInfo error={error} />)
          .split('\n')
          .forEach((line) => {
            console.error(line) // eslint-disable-line no-console
          })
      } else {
        console.error(error) // eslint-disable-line no-console
      }

      return 1
    } finally {
      clear()
    }
  }
}
