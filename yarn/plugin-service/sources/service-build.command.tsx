import { Filename }                       from '@yarnpkg/fslib'
import { execUtils }                      from '@yarnpkg/core'
import { xfs }                            from '@yarnpkg/fslib'
import { render }                         from 'ink'
import React                              from 'react'

import { ErrorInfo }                      from '@atls/cli-ui-error-info-component'
import { ServiceProgress }                from '@atls/cli-ui-service-progress-component'
import { Service }                        from '@atls/code-service'
import { COMMAND_PROXY_EXECUTION }        from '@atls/yarn-plugin-tools/command-context'
import { renderStatic }                   from '@atls/cli-ui-renderer-static-component'
import { createCommandProxyEnvironment }  from '@atls/yarn-plugin-tools/command-context'
import { resolveWorkspaceCommandContext } from '@atls/yarn-plugin-tools/command-context'
import { makeCurrentYarnExecutable }      from '@atls/yarn-plugin-tools/current-yarn-executable'

import { AbstractServiceCommand }         from './abstract-service.command.jsx'
import { getWorkspacePackageNames }       from './workspace-package-names.js'

export class ServiceBuildCommand extends AbstractServiceCommand {
  static override paths = [['service', 'build']]

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular()
    }

    if (process.env[COMMAND_PROXY_EXECUTION] === 'true') {
      return this.executeRegular()
    }

    return this.executeProxy()
  }

  async executeProxy(): Promise<number> {
    const { project, workspaceCwd } = await resolveWorkspaceCommandContext(
      this.context.cwd,
      this.context.plugins
    )

    const args: Array<string> = []

    if (this.showWarnings) {
      args.push('-s')
    }

    const binFolder = await xfs.mktempPromise()
    const { executable, env } = await makeCurrentYarnExecutable({
      binFolder,
      project,
      env: createCommandProxyEnvironment(this.context.cwd),
    })

    const { code } = await execUtils.pipevp(executable, ['service', 'build', ...args], {
      cwd: workspaceCwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env,
    })

    return code
  }

  async executeRegular(): Promise<number> {
    const { workspace, workspaceCwd } = await resolveWorkspaceCommandContext(
      this.context.cwd,
      this.context.plugins
    )
    const service = await Service.initialize(workspaceCwd, getWorkspacePackageNames(workspace))

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
