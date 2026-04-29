import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { scriptUtils }            from '@yarnpkg/core'
import { xfs }                    from '@yarnpkg/fslib'
import { render }                 from 'ink'
import React                      from 'react'

import { ServiceProgress }        from '@atls/cli-ui-service-progress-component'
import { executeYarnPnpProxy }    from '@atls/yarn-run-utils'
import { pipeYarnPnpProxy }       from '@atls/yarn-run-utils'

import { AbstractServiceCommand } from './abstract-service.command.jsx'

export class ServiceDevCommand extends AbstractServiceCommand {
  static override paths = [['service', 'dev']]

  override async execute(): Promise<number> {
    return executeYarnPnpProxy({
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      executeRegular: async () => this.executeRegular(),
      executeProxy: async () => this.executeProxy(),
    })
  }

  async executeProxy(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const args: Array<string> = []

    if (this.showWarnings) {
      args.push('-s')
    }

    const binFolder = await xfs.mktempPromise()

    return pipeYarnPnpProxy({
      args: ['service', 'dev', ...args],
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env: {
        ...(await scriptUtils.makeScriptEnv({ binFolder, project, ignoreCorepack: true })),
        COMMAND_PROXY_EXECUTION: 'true',
      },
    })
  }

  async executeRegular(): Promise<number> {
    const { Service } = await import('@atls/code-service')
    const service = await Service.initialize(this.context.cwd)

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
