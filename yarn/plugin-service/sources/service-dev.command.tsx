import { BaseCommand }                from '@yarnpkg/cli'
import { render }                     from 'ink'
import React                          from 'react'

import { ServiceProgress }            from '@atls/cli-ui-service-progress-component'
import { Service }                    from '@atls/code-service'
import { proxyWorkspaceCommand }      from '@atls/raijin/commands'
import { resolveWorkspaceInvocation } from '@atls/raijin/commands'
import { shouldProxyCommand }         from '@atls/raijin/commands'
import { toNativeCwd }                from '@atls/raijin/commands'

import { AbstractServiceCommand }     from './abstract-service.command.jsx'
import { getWorkspacePackageNames }   from './workspace-package-names.js'

export class ServiceDevCommand extends AbstractServiceCommand {
  static override paths = [['service', 'dev']]

  static override usage = BaseCommand.Usage({
    description: 'run a service in development mode',
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
      args: ['service', 'dev', ...args],
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
