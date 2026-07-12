import { render }                            from 'ink'
import React                                 from 'react'

import { ServiceProgress }                   from '@atls/cli-ui-service-progress-component'
import { Service }                           from '@atls/code-service'
import { executeWorkspaceCommandProxy }      from '@atls/raijin/commands'
import { resolveWorkspaceCommandInvocation } from '@atls/raijin/commands'
import { shouldExecuteCommandProxy }         from '@atls/raijin/commands'

import { AbstractServiceCommand }            from './abstract-service.command.jsx'
import { getWorkspacePackageNames }          from './workspace-package-names.js'

export class ServiceDevCommand extends AbstractServiceCommand {
  static override paths = [['service', 'dev']]

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
      args: ['service', 'dev', ...args],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const { workspace, workspaceCwd } = await resolveWorkspaceCommandInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const service = await Service.initialize(workspaceCwd, getWorkspacePackageNames(workspace))

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
