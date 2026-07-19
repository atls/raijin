import { BaseCommand }                from '@yarnpkg/cli'
import { Option }                     from 'clipanion'
import { render }                     from 'ink'
import React                          from 'react'

import { ErrorInfo }                  from '@atls/cli-ui-error-info-component'
import { LintProgress }               from '@atls/cli-ui-lint-progress-component'
import { LintResult }                 from '@atls/cli-ui-lint-result-component'
import { Linter }                     from '@atls/code-lint'
import { renderStatic }               from '@atls/cli-ui-renderer-static-component'
import { createCommandInput }         from '@atls/raijin/commands'
import { resolveWorkspaceInvocation } from '@atls/raijin/commands'
import { proxyWorkspaceCommand }      from '@atls/raijin/commands'
import { resolveProjectInvocation }   from '@atls/raijin/commands'
import { shouldProxyCommand }         from '@atls/raijin/commands'
import { toCommandArguments }         from '@atls/raijin/commands'
import { toNativeCwd }                from '@atls/raijin/commands'

interface LintCommandResult {
  messages: Array<unknown>
}

export const hasLintMessages = (result: LintCommandResult): boolean => result.messages.length > 0

export class LintCommand extends BaseCommand {
  static override paths = [['lint']]

  static override usage = BaseCommand.Usage({
    description: 'lint project files',
  })

  fix = Option.Boolean('--fix')

  files: Array<string> = Option.Rest({ required: 0 })

  cache: boolean = Option.Boolean('--cache', false)

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    const args: Array<string> = []
    const { invocationCwd } = await resolveProjectInvocation(this.context.cwd, this.context.plugins)
    const input = createCommandInput({
      cwd: invocationCwd,
      source: 'explicit',
      targets: this.files,
    })

    if (this.fix) {
      args.push('--fix')
    }

    if (this.cache) {
      args.push('--cache')
    }

    return proxyWorkspaceCommand({
      args: ['lint', ...args, ...toCommandArguments(input)],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const { executionCwd, invocationCwd, project } = await resolveWorkspaceInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const projectCwd = toNativeCwd(project.cwd)

    const linter = await Linter.initialize(projectCwd, toNativeCwd(executionCwd))
    const input = createCommandInput({
      cwd: invocationCwd,
      source: 'explicit',
      targets: this.files,
    })

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
      const results = await linter.lint(input.targets.length > 0 ? input : undefined, {
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
