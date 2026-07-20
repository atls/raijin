import { BaseCommand }                from '@yarnpkg/cli'
import { render }                     from 'ink'
import React                          from 'react'

import { ErrorInfo }                  from '@atls/cli-ui-error-info-component'
import { ServiceProgress }            from '@atls/cli-ui-service-progress-component'
import { Service }                    from '@atls/code-service'
import { renderStatic }               from '@atls/cli-ui-renderer-static-component'
import { proxyWorkspaceCommand }      from '@atls/raijin/commands'
import { resolveWorkspaceInvocation } from '@atls/raijin/commands'
import { shouldProxyCommand }         from '@atls/raijin/commands'
import { toNativeCwd }                from '@atls/raijin/commands'

import { AbstractServiceCommand }     from './abstract-service.command.jsx'
import { getWorkspacePackageNames }   from './workspace-package-names.js'

export class ServiceBuildCommand extends AbstractServiceCommand {
  static override paths = [['service', 'build']]

  static override usage = BaseCommand.Usage({
    description: 'build a service production artifact',
  })

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    const args: Array<string> = []

    if (this.showWarnings) {
      args.push('-s')
    }

    return proxyWorkspaceCommand({
      args: ['service', 'build', ...args],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const { executionCwd, workspace } = await resolveWorkspaceInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const service = await Service.initialize(
      toNativeCwd(executionCwd),
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
