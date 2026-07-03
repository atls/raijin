import { resolve }                        from 'node:path'
import { isAbsolute }                     from 'node:path'

import { BaseCommand }                    from '@yarnpkg/cli'
import { Filename }                       from '@yarnpkg/fslib'
import { execUtils }                      from '@yarnpkg/core'
import { xfs }                            from '@yarnpkg/fslib'
import { Option }                         from 'clipanion'
import { render }                         from 'ink'
import React                              from 'react'

import { ErrorInfo }                      from '@atls/cli-ui-error-info-component'
import { LintProgress }                   from '@atls/cli-ui-lint-progress-component'
import { LintResult }                     from '@atls/cli-ui-lint-result-component'
import { Linter }                         from '@atls/code-lint'
import { renderStatic }                   from '@atls/cli-ui-renderer-static-component'
import { resolveWorkspaceCommandContext } from '@atls/yarn-plugin-tools/command-context'
import { makeCurrentYarnExecutable }      from '@atls/yarn-plugin-tools/current-yarn-executable'

const resolveTargetFiles = (files: Array<string>, invocationCwd: string): Array<string> =>
  files.map((file) => (isAbsolute(file) ? file : resolve(invocationCwd, file)))

export class LintCommand extends BaseCommand {
  static override paths = [['lint']]

  fix = Option.Boolean('--fix')

  files: Array<string> = Option.Rest({ required: 0 })

  cache: boolean = Option.Boolean('--cache', false)

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

    const args = []

    if (this.fix) {
      args.push('--fix')
    }

    if (this.cache) {
      args.push('--cache')
    }

    const { executable, env } = await makeCurrentYarnExecutable({
      binFolder,
      project,
      env: {
        COMMAND_PROXY_EXECUTION: 'true',
      },
    })

    const { code } = await execUtils.pipevp(executable, ['lint', ...args, ...this.files], {
      cwd: workspaceCwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env,
    })

    return code
  }

  async executeRegular(): Promise<number> {
    const { project, invocationCwd, workspaceCwd } = await resolveWorkspaceCommandContext(
      this.context.cwd,
      this.context.plugins
    )

    const linter = await Linter.initialize(project.cwd, workspaceCwd)
    const files = resolveTargetFiles(this.files, invocationCwd)

    const { clear } = render(<LintProgress cwd={project.cwd} linter={linter} />)

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

      return results.find((result) => result.messages.length > 0) ? 1 : 0
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
