import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { Filename }               from '@yarnpkg/fslib'
import { scriptUtils }            from '@yarnpkg/core'
import { execUtils }              from '@yarnpkg/core'
import { xfs }                    from '@yarnpkg/fslib'
import { render }                 from 'ink'
import React                      from 'react'

import { ServiceProgress }        from '@atls/cli-ui-service-progress-component'
import { Service }                from '@atls/code-service'

import { AbstractServiceCommand } from './abstract-service.command.jsx'

export class ServiceDevCommand extends AbstractServiceCommand {
  static override paths = [['service', 'dev']]

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
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

    const { code } = await execUtils.pipevp('yarn', ['service', 'dev', ...args], {
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env: await scriptUtils.makeScriptEnv({ binFolder, project }),
    })

    return code
  }

  async executeRegular(): Promise<number> {
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
