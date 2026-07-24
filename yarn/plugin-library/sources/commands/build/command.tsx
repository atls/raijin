import { BaseCommand }                from '@yarnpkg/cli'
import { Option }                     from 'clipanion'
import { render }                     from 'ink'
import React                          from 'react'

import { ErrorInfo }                  from '@atls/cli-ui-error-info-component'
import { TypeScriptDiagnostic }       from '@atls/cli-ui-typescript-diagnostic-component'
import { TypeScriptProgress }         from '@atls/cli-ui-typescript-progress-component'
import { TypeScript }                 from '@atls/code-typescript'
import { renderStatic }               from '@atls/cli-ui-renderer-static-component'
import { proxyWorkspaceCommand }      from '@atls/raijin/commands'
import { resolveWorkspaceInvocation } from '@atls/raijin/commands'
import { shouldProxyCommand }         from '@atls/raijin/commands'
import { toNativeCwd }                from '@atls/raijin/commands'

import { buildLibraryWorkspace }      from '../../workspace/index.js'

export class LibraryBuildCommand extends BaseCommand {
  static override paths = [['library', 'build']]

  static override usage = BaseCommand.Usage({
    description: 'build a library workspace',
  })

  target = Option.String('-t,--target', './dist')

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    const args: Array<string> = []

    if (this.target) {
      args.push('-t')
      args.push(this.target)
    }

    return proxyWorkspaceCommand({
      args: ['library', 'build', ...args],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const { executionCwd } = await resolveWorkspaceInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const cwd = toNativeCwd(executionCwd)
    const typescript = await TypeScript.initialize(cwd)
    const { clear } = render(<TypeScriptProgress typescript={typescript} />)

    try {
      const diagnostics = await buildLibraryWorkspace({
        cwd,
        target: this.target,
        typescript,
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
}
