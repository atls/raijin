import { rm }                             from 'node:fs/promises'
import { join }                           from 'node:path'

import { BaseCommand }                    from '@yarnpkg/cli'
import { Filename }                       from '@yarnpkg/fslib'
import { execUtils }                      from '@yarnpkg/core'
import { xfs }                            from '@yarnpkg/fslib'
import { Option }                         from 'clipanion'
import { render }                         from 'ink'
import React                              from 'react'

import { ErrorInfo }                      from '@atls/cli-ui-error-info-component'
import { TypeScriptDiagnostic }           from '@atls/cli-ui-typescript-diagnostic-component'
import { TypeScriptProgress }             from '@atls/cli-ui-typescript-progress-component'
import { TypeScript }                     from '@atls/code-typescript'
import { renderStatic }                   from '@atls/cli-ui-renderer-static-component'
import { resolveWorkspaceCommandContext } from '@atls/yarn-plugin-tools/command-context'
import { makeCurrentYarnExecutable }      from '@atls/yarn-plugin-tools/current-yarn-executable'

export class LibraryBuildCommand extends BaseCommand {
  static override paths = [['library', 'build']]

  target = Option.String('-t,--target', './dist')

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

    const args: Array<string> = []

    if (this.target) {
      args.push('-t')
      args.push(this.target)
    }

    const binFolder = await xfs.mktempPromise()
    const { executable, env } = await makeCurrentYarnExecutable({
      binFolder,
      project,
      env: {
        COMMAND_PROXY_EXECUTION: 'true',
      },
    })

    const { code } = await execUtils.pipevp(executable, ['library', 'build', ...args], {
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

    await this.cleanTarget(workspaceCwd)

    const typescript = await TypeScript.initialize(workspaceCwd)

    const { clear } = render(<TypeScriptProgress typescript={typescript} />)

    try {
      const diagnostics = await typescript.build([join(workspaceCwd, './src')], {
        outDir: join(workspaceCwd, this.target),
        declaration: true,
      })

      diagnostics.forEach((diagnostic) => {
        const output = renderStatic(<TypeScriptDiagnostic {...diagnostic} />)

        output.split('\n').forEach((line) => {
          console.log(line) // eslint-disable-line no-console
        })
      })

      return diagnostics.length === 0 ? 0 : 1
    } catch (error) {
      renderStatic(<ErrorInfo error={error as Error} />)
        .split('\n')
        .forEach((line) => {
          console.error(line) // eslint-disable-line no-console
        })

      return 1
    } finally {
      clear()
    }
  }

  protected async cleanTarget(workspaceCwd: string): Promise<void> {
    try {
      await rm(join(workspaceCwd, this.target), { recursive: true, force: true })
      // eslint-disable-next-line no-empty
    } catch {}
  }
}
