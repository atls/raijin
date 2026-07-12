import type { PortablePath }                 from '@yarnpkg/fslib'

import { resolve }                           from 'node:path'
import { isAbsolute }                        from 'node:path'

import { BaseCommand }                       from '@yarnpkg/cli'
import { Option }                            from 'clipanion'
import { render }                            from 'ink'
import React                                 from 'react'

import { ErrorInfo }                         from '@atls/cli-ui-error-info-component'
import { LintProgress }                      from '@atls/cli-ui-lint-progress-component'
import { LintResult }                        from '@atls/cli-ui-lint-result-component'
import { Linter }                            from '@atls/code-lint'
import { renderStatic }                      from '@atls/cli-ui-renderer-static-component'
import { resolveNativeCommandCwd }           from '@atls/raijin/commands'
import { resolveWorkspaceCommandInvocation } from '@atls/raijin/commands'
import { executeWorkspaceCommandProxy }      from '@atls/raijin/commands'
import { shouldExecuteCommandProxy }         from '@atls/raijin/commands'

export const resolveLintTargetFiles = (
  files: Array<string>,
  invocationCwd: PortablePath
): Array<string> => {
  const nativeInvocationCwd = resolveNativeCommandCwd(invocationCwd)

  return files.map((file) => (isAbsolute(file) ? file : resolve(nativeInvocationCwd, file)))
}

interface LintCommandResult {
  messages: Array<unknown>
}

export const hasLintMessages = (result: LintCommandResult): boolean => result.messages.length > 0

export class LintCommand extends BaseCommand {
  static override paths = [['lint']]

  fix = Option.Boolean('--fix')

  files: Array<string> = Option.Rest({ required: 0 })

  cache: boolean = Option.Boolean('--cache', false)

  override async execute(): Promise<number> {
    if (shouldExecuteCommandProxy()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    const args: Array<string> = []

    if (this.fix) {
      args.push('--fix')
    }

    if (this.cache) {
      args.push('--cache')
    }

    return executeWorkspaceCommandProxy({
      args: ['lint', ...args, ...this.files],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const { project, invocationCwd, workspaceCwd } = await resolveWorkspaceCommandInvocation(
      this.context.cwd,
      this.context.plugins
    )

    const projectCwd = resolveNativeCommandCwd(project.cwd)
    const workspaceNativeCwd = resolveNativeCommandCwd(workspaceCwd)
    const linter = await Linter.initialize(projectCwd, workspaceNativeCwd)
    const files = resolveLintTargetFiles(this.files, invocationCwd)

    const { clear } = render(<LintProgress cwd={projectCwd} linter={linter} />)

    linter.on('lint:end', ({ result }) => {
      if (result.messages.length > 0) {
        const output = renderStatic(<LintResult {...result} />)

        output.split('\n').forEach((line) => {
          console.log(line) // eslint-disable-line no-console
        })
      }
    })

    try {
      const results = await linter.lint(files, {
        fix: this.fix,
        cache: this.cache,
      })

      return results.find(hasLintMessages) ? 1 : 0
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
