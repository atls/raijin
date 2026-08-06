import type { CommandInput }             from '@atls/raijin/commands'
import type { ProcessExecutionResult }   from '@atls/raijin/commands'
import type { ProjectCommandContext }    from '@atls/raijin/commands'
import type { ProjectInvocation }        from '@atls/raijin/commands'
import type { ProjectProcessInvocation } from '@atls/raijin/commands'
import type { Project }                  from '@yarnpkg/core'

import type { TypeScriptConfigRuntime }  from './checks-typecheck.interfaces.js'

import { BaseCommand }                   from '@yarnpkg/cli'
import { StreamReport }                  from '@yarnpkg/core'
import { MessageName }                   from '@yarnpkg/core'
import { xfs }                           from '@yarnpkg/fslib'
import { Option }                        from 'clipanion'

import { createCommandInput }            from '@atls/raijin/commands'
import { toCommandArguments }            from '@atls/raijin/commands'
import { toNativeCwd }                   from '@atls/raijin/commands'
import { resolveRaijinRuntimeUrl }       from '@atls/raijin/runtime-resolver'
import { getChangedFiles }               from '@atls/yarn-plugin-files'

import { GitHubChecks }                  from './github.checks.js'

const TYPECHECK_TIMEOUT_MS = 5 * 60 * 1000
const TYPESCRIPT_CONFIG_SPECIFIER = '@atls/raijin/config/typescript'

const formatTypecheckFailure = (result: ProcessExecutionResult): string => {
  switch (result.reason) {
    case 'completed':
      return `TypeCheck failed with exit code ${result.exitCode}`
    case 'timed-out':
      return `TypeCheck timed out after ${TYPECHECK_TIMEOUT_MS / 1000}s`
    case 'cancelled':
      return 'TypeCheck was cancelled'
    case 'signalled':
      return result.signal
        ? `TypeCheck was terminated by ${result.signal}`
        : 'TypeCheck was terminated by a signal'
    case 'start-failed':
      return result.cause instanceof Error
        ? `TypeCheck failed to start: ${result.cause.message}`
        : 'TypeCheck failed to start'
    default: {
      const exhaustiveResult: never = result

      return exhaustiveResult
    }
  }
}

const importTypeScriptConfigRuntime = async (cwd: string): Promise<TypeScriptConfigRuntime> =>
  (await import(
    resolveRaijinRuntimeUrl(cwd, TYPESCRIPT_CONFIG_SPECIFIER)
  )) as TypeScriptConfigRuntime

class ChecksTypeCheckCommand extends BaseCommand {
  static override paths = [['checks', 'typecheck']]

  static override usage = BaseCommand.Usage({
    description: 'report TypeScript diagnostics to GitHub Checks',
  })

  changed = Option.Boolean('--changed', false)

  declare context: ProjectCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
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
              const input = await this.getInput(
                yarn.project,
                project.workspacePatterns,
                invocation.process
              )

              if (this.changed && input?.targets.length === 0) {
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
                input
                  ? `TypeCheck targets: ${input.targets.length}`
                  : 'TypeCheck targets: project tsconfig'
              )

              const result = await this.runTypecheck(invocation, input)

              if (result.reason === 'completed' && result.exitCode === 0) {
                await checks.complete(checkId, {
                  title: 'Successful',
                  summary: 'All checks passed',
                  annotations: [],
                })
              } else {
                const summary = formatTypecheckFailure(result)

                await checks.failure(
                  {
                    title: 'TypeCheck run failed',
                    summary,
                  },
                  checkId
                )

                report.reportError(MessageName.UNNAMED, summary)
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

  protected async getInput(
    project: Project,
    workspacePatterns: Array<string>,
    processInvocation?: ProjectProcessInvocation
  ): Promise<CommandInput | undefined> {
    if (this.changed) {
      if (!processInvocation) {
        throw new Error('Changed TypeScript targets require command invocation')
      }

      const input = createCommandInput({
        cwd: project.cwd,
        source: 'changed',
        targets: (await getChangedFiles(processInvocation)).filter((file) =>
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

    const nativeProjectCwd = toNativeCwd(project.cwd)
    const { hasTypeScriptProject } = await importTypeScriptConfigRuntime(nativeProjectCwd)

    if (hasTypeScriptProject(nativeProjectCwd)) {
      return undefined
    }

    return createCommandInput({
      cwd: project.cwd,
      source: 'generated',
      targets: workspacePatterns,
    })
  }

  private async runTypecheck(
    invocation: ProjectInvocation,
    input: CommandInput | undefined
  ): Promise<ProcessExecutionResult> {
    return invocation.yarn.run(
      ['typecheck', ...(input ? toCommandArguments(input, invocation.project.cwd) : [])],
      {
        input: 'ignore',
        timeoutMs: TYPECHECK_TIMEOUT_MS,
      }
    )
  }
}

export { ChecksTypeCheckCommand }
