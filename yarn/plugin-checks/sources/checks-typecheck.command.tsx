import type { CommandInput }         from '@atls/raijin/commands'
import type { Project }              from '@yarnpkg/core'

import { spawn }                     from 'node:child_process'

import { BaseCommand }               from '@yarnpkg/cli'
import { StreamReport }              from '@yarnpkg/core'
import { MessageName }               from '@yarnpkg/core'
import { xfs }                       from '@yarnpkg/fslib'
import { ppath }                     from '@yarnpkg/fslib'
import { Option }                    from 'clipanion'

import { createChildProcessOptions } from '@atls/raijin/commands'
import { createCommandInput }        from '@atls/raijin/commands'
import { createYarnExecutable }      from '@atls/raijin/commands'
import { proxyProjectCommand }       from '@atls/raijin/commands'
import { resolveProjectInvocation }  from '@atls/raijin/commands'
import { shouldProxyCommand }        from '@atls/raijin/commands'
import { toCommandArguments }        from '@atls/raijin/commands'
import { getChangedFiles }           from '@atls/yarn-plugin-files'

import { GitHubChecks }              from './github.checks.js'

const TYPECHECK_TIMEOUT_MS = 5 * 60 * 1000

class ChecksTypeCheckCommand extends BaseCommand {
  static override paths = [['checks', 'typecheck']]

  changed = Option.Boolean('--changed', false)

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    const args = ['checks', 'typecheck', ...(this.changed ? ['--changed'] : [])]

    return proxyProjectCommand({
      args,
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const invocation = await resolveProjectInvocation(this.context.cwd, this.context.plugins)
    const { project, yarn } = invocation
    const { configuration } = yarn

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        const checks = new GitHubChecks('TypeCheck')

        try {
          const { id: checkId } = await checks.start()

          await report.startTimerPromise('TypeCheck', async () => {
            try {
              const includes = await this.getIncludes(yarn.project, project.workspacePatterns)

              if (this.changed && includes.targets.length === 0) {
                report.reportInfo(MessageName.UNNAMED, 'No TypeScript files changed')

                await checks.complete(checkId, {
                  title: 'Successful',
                  summary: 'No TypeScript files changed',
                  annotations: [],
                })

                return
              }

              report.reportInfo(
                MessageName.UNNAMED,
                `TypeCheck targets: ${includes.targets.length}`
              )

              const code = await this.runTypecheck(invocation, includes)

              if (code === 0) {
                await checks.complete(checkId, {
                  title: 'Successful',
                  summary: 'All checks passed',
                  annotations: [],
                })
              } else {
                await checks.failure(
                  {
                    title: 'TypeCheck run failed',
                    summary:
                      code === 124
                        ? `TypeCheck timed out after ${TYPECHECK_TIMEOUT_MS / 1000}s`
                        : `TypeCheck failed with exit code ${code}`,
                  },
                  checkId
                )

                report.reportError(
                  MessageName.UNNAMED,
                  code === 124
                    ? `TypeCheck timed out after ${TYPECHECK_TIMEOUT_MS / 1000}s`
                    : `TypeCheck failed with exit code ${code}`
                )
              }
            } catch (error) {
              await checks.failure(
                {
                  title: 'TypeCheck run failed',
                  summary: error instanceof Error ? error.message : (error as string),
                },
                checkId
              )
            }
          })
        } catch (error) {
          await checks.failure({
            title: 'TypeCheck start failed',
            summary: error instanceof Error ? error.message : (error as string),
          })
        }
      }
    )

    return commandReport.exitCode()
  }

  protected async getIncludes(
    project: Project,
    workspacePatterns: Array<string>
  ): Promise<CommandInput> {
    if (this.changed) {
      const input = createCommandInput({
        cwd: project.cwd,
        source: 'changed',
        targets: (await getChangedFiles(project)).filter((file) =>
          /\.(cts|mts|ts|tsx)$/.test(file)),
      })

      const existsMap = await Promise.all(
        input.targets.map(async ({ path }) => xfs.existsPromise(path))
      )

      return {
        ...input,
        targets: input.targets.filter((_, index) => existsMap[index]),
      }
    }

    if (await xfs.existsPromise(ppath.join(project.cwd, 'tsconfig.json'))) {
      const tsconfig: { include?: Array<string> } = await xfs.readJsonPromise(
        ppath.join(project.cwd, 'tsconfig.json')
      )

      if (tsconfig.include && tsconfig.include.length > 0) {
        return createCommandInput({
          cwd: project.cwd,
          source: 'generated',
          targets: tsconfig.include,
        })
      }
    }

    return createCommandInput({
      cwd: project.cwd,
      source: 'generated',
      targets: workspacePatterns,
    })
  }

  private async runTypecheck(
    invocation: Awaited<ReturnType<typeof resolveProjectInvocation>>,
    input: CommandInput
  ): Promise<number> {
    const { project } = invocation.yarn
    const binFolder = await xfs.mktempPromise()
    const { executable, env } = await createYarnExecutable({
      binFolder,
      project,
    })
    let timeout: NodeJS.Timeout | undefined

    return new Promise((resolvePromise, rejectPromise) => {
      let timedOut = false
      const child = spawn(
        executable,
        ['typecheck', ...toCommandArguments(input, invocation.project.cwd)],
        createChildProcessOptions({
          invocation,
          env,
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      )

      child.stdout?.pipe(this.context.stdout, { end: false })
      child.stderr?.pipe(this.context.stderr, { end: false })

      timeout = setTimeout(() => {
        timedOut = true
        child.kill('SIGTERM')

        setTimeout(() => {
          if (!child.killed) {
            child.kill('SIGKILL')
          }
        }, 5000).unref()
      }, TYPECHECK_TIMEOUT_MS)

      child.on('error', rejectPromise)
      child.on('close', (code) => {
        if (timeout) {
          clearTimeout(timeout)
        }

        resolvePromise(timedOut ? 124 : (code ?? 1))
      })
    })
  }
}

export { ChecksTypeCheckCommand }
