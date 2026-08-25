import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                  from '@yarnpkg/cli'
import { MessageName }                  from '@yarnpkg/core'
import { StreamReport }                 from '@yarnpkg/core'
import { Option }                       from 'clipanion'

import { formatChangedStateManagedError } from '@atls/yarn-plugin-files'
import { resolveChangedProjectStateForEntrypoint } from '@atls/yarn-plugin-files'

import { expandWorkspaceDependents }    from './expand-workspace-dependents.js'
import { createForeachInput }           from './workspaces-changed-foreach.input.js'

class WorkspacesChangedForeachCommand extends BaseCommand {
  static override paths = [['workspaces', 'changed', 'foreach']]

  static override usage = BaseCommand.Usage({
    description: 'run a command in changed workspaces',
  })

  exclude = Option.String('--exclude', '')

  verbose = Option.Boolean('-v,--verbose', false)

  parallel = Option.Boolean('-p,--parallel', false)

  workTree = Option.Boolean('-W,--worktree', true)

  all = Option.Boolean('-A,--all', false)

  recursive = Option.Boolean('-R,--recursive', false)

  since = Option.String('--since', '')

  interlaced = Option.Boolean('-i,--interlaced', false)

  publicOnly: boolean = Option.Boolean('--no-private', false)

  topological: boolean = Option.Boolean('-t,--topological', false)

  topologicalDev: boolean = Option.Boolean('--topological-dev', false)

  jobs?: number = Option.String('-j,--jobs')

  commandName = Option.String()

  args = Option.Proxy()

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { yarn } = invocation
    const { configuration, project } = yarn

    const result = await resolveChangedProjectStateForEntrypoint({
      processInvocation: invocation.process,
      project,
      since: this.since || undefined,
    })

    if (result.kind === 'error') {
      const commandReport = await StreamReport.start(
        {
          configuration,
          stdout: this.context.stdout,
        },
        async (report) => {
          report.reportError(MessageName.UNNAMED, formatChangedStateManagedError(result))
        }
      )

      return commandReport.exitCode()
    }

    const state = expandWorkspaceDependents(project, result.state)

    if (!state.workspaces.length) {
      const commandReport = await StreamReport.start(
        {
          configuration,
          stdout: this.context.stdout,
        },
        async (report) => {
          report.reportInfo(null, 'No workspaces changed')
        }
      )

      return commandReport.exitCode()
    }

    const input = createForeachInput(
      state.workspaces.map(({ path }) => path),
      {
        exclude: this.exclude,
        verbose: this.verbose,
        parallel: this.parallel,
        interlaced: this.interlaced,
        publicOnly: this.publicOnly,
        topological: this.topological,
        topologicalDev: this.topologicalDev,
        jobs: this.jobs,
      }
    )

    return invocation.yarn.execute([...input, this.commandName, ...this.args])
  }
}

export { WorkspacesChangedForeachCommand }
