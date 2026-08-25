import type { ProcessExecutionResult } from '@atls/raijin/commands'
import type { ProjectCommandContext }  from '@atls/raijin/commands'
import type { ProjectInvocation }      from '@atls/raijin/commands'
import type { ChangedProjectState }    from '@atls/yarn-plugin-files'

import { BaseCommand }                 from '@yarnpkg/cli'
import { MessageName }                 from '@yarnpkg/core'
import { StreamReport }                from '@yarnpkg/core'
import { Option }                      from 'clipanion'

import { formatChangedStateManagedError } from '@atls/yarn-plugin-files'
import { resolveChangedProjectStateForEntrypoint } from '@atls/yarn-plugin-files'
import { createForeachInput }          from '@atls/yarn-plugin-workspaces'
import { expandWorkspaceDependents }   from '@atls/yarn-plugin-workspaces'

import { GitHubChecks }                from './github.checks.js'

const TYPECHECK_TIMEOUT_MS = 5 * 60 * 1000

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

export const createTypecheckArguments = (
  state?: ChangedProjectState
): Array<string> | undefined => {
  if (!state) {
    return ['typecheck']
  }

  if (state.workspaces.length === 0) {
    return undefined
  }

  return [
    ...createForeachInput(
      state.workspaces.map(({ path }) => path),
      {}
    ),
    'typecheck',
  ]
}

class ChecksTypeCheckCommand extends BaseCommand {
  static override paths = [['checks', 'typecheck']]

  static override usage = BaseCommand.Usage({
    description: 'report TypeScript diagnostics to GitHub Checks',
  })

  changed = Option.Boolean('--changed', false)

  declare context: ProjectCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { yarn } = invocation
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
              let state: ChangedProjectState | undefined

              if (this.changed) {
                const result = await resolveChangedProjectStateForEntrypoint({
                  processInvocation: invocation.process,
                  project: yarn.project,
                })

                if (result.kind === 'error') {
                  const summary = formatChangedStateManagedError(result)

                  await checks.failure({ title: 'TypeCheck run failed', summary }, checkId)
                  report.reportError(MessageName.UNNAMED, summary)

                  return
                }

                state = expandWorkspaceDependents(yarn.project, result.state)
              }

              const args = createTypecheckArguments(state)

              if (!args) {
                report.reportInfo(MessageName.UNNAMED, 'No TypeScript projects changed')

                await checks.complete(checkId, {
                  title: 'Successful',
                  summary: 'No TypeScript projects changed',
                  annotations: [],
                })

                return
              }

              report.reportInfo(
                MessageName.UNNAMED,
                state
                  ? `TypeCheck projects: ${state.workspaces.length}`
                  : 'TypeCheck project: current workspace'
              )

              const result = await this.runTypecheck(invocation, args)

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
              const summary = error instanceof Error ? error.message : String(error)

              await checks.failure(
                {
                  title: 'TypeCheck run failed',
                  summary,
                },
                checkId
              )
              report.reportError(MessageName.UNNAMED, summary)
            }
          })
        } catch (error) {
          const summary = error instanceof Error ? error.message : String(error)

          await checks.failure({
            title: 'TypeCheck start failed',
            summary,
          })
          report.reportError(MessageName.UNNAMED, summary)
        }
      }
    )

    return commandReport.exitCode()
  }

  protected async runTypecheck(
    invocation: ProjectInvocation,
    args: Array<string>
  ): Promise<ProcessExecutionResult> {
    return invocation.yarn.run(args, {
      input: 'ignore',
      timeoutMs: TYPECHECK_TIMEOUT_MS,
    })
  }
}

export { ChecksTypeCheckCommand }
