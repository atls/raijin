import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { Filename }               from '@yarnpkg/fslib'
import { execUtils }              from '@yarnpkg/core'
import { xfs }                    from '@yarnpkg/fslib'
import { render }                 from 'ink'
import React                      from 'react'

import { ErrorInfo }              from '@atls/cli-ui-error-info-component'
import { ServiceProgress }        from '@atls/cli-ui-service-progress-component'
import { Service }                from '@atls/code-service'
import { renderStatic }           from '@atls/cli-ui-renderer-static-component'
import { makeYarnReentry }        from '@atls/yarn-run-utils'

import { AbstractServiceCommand } from './abstract-service.command.jsx'

export class ServiceBuildCommand extends AbstractServiceCommand {
  static override paths = [['service', 'build']]

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular()
    }

    if (process.env.COMMAND_PROXY_EXECUTION === 'true') {
      return this.executeRegular()
    }

    return this.executeProxy()
  }

  async executeProxy(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const args: Array<string> = []

    if (this.showWarnings) {
      args.push('-s')
    }

    const binFolder = await xfs.mktempPromise()
    const { executable, env } = await makeYarnReentry({
      binFolder,
      project,
      env: {
        COMMAND_PROXY_EXECUTION: 'true',
      },
    })

    const { code } = await execUtils.pipevp(executable, ['service', 'build', ...args], {
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env,
    })

    return code
  }

  async executeRegular(): Promise<number> {
    const service = await Service.initialize(this.context.cwd)

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
