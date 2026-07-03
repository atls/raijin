import { spawn }                           from 'node:child_process'

import { BaseCommand }                     from '@yarnpkg/cli'
import { Filename }                        from '@yarnpkg/fslib'
import { execUtils }                       from '@yarnpkg/core'
import { xfs }                             from '@yarnpkg/fslib'

import { createServiceRuntimeEnvironment } from '@atls/code-service'
import { createServiceRuntimeExecArgv }    from '@atls/code-service'
import { resolveWorkspaceCommandContext }  from '@atls/yarn-plugin-tools/command-context'
import { makeCurrentYarnExecutable }       from '@atls/yarn-plugin-tools/current-yarn-executable'

export class ServiceStartCommand extends BaseCommand {
  static override paths = [['service', 'start']]

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
    const { project, workspaceCwd } = await resolveWorkspaceCommandContext(
      this.context.cwd,
      this.context.plugins
    )

    const binFolder = await xfs.mktempPromise()
    const { executable, env } = await makeCurrentYarnExecutable({
      binFolder,
      project,
      env: {
        COMMAND_PROXY_EXECUTION: 'true',
      },
    })

    const { code } = await execUtils.pipevp(executable, ['service', 'start'], {
      cwd: workspaceCwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env,
    })

    return code
  }

  async executeRegular(): Promise<number> {
    const { workspaceCwd } = await resolveWorkspaceCommandContext(
      this.context.cwd,
      this.context.plugins
    )

    const child = spawn(
      process.execPath,
      [...(await createServiceRuntimeExecArgv(workspaceCwd)), 'dist/index.js'],
      {
        cwd: workspaceCwd,
        env: await createServiceRuntimeEnvironment(process.env),
        stdio: [this.context.stdin, this.context.stdout, this.context.stderr],
      }
    )

    return new Promise<number>((resolve, reject) => {
      child.once('error', reject)
      child.once('exit', (code) => {
        resolve(code ?? 1)
      })
    })
  }
}
