import { BaseCommand }                from '@yarnpkg/cli'
import { StreamReport }               from '@yarnpkg/core'
import { structUtils }                from '@yarnpkg/core'
import { Option }                     from 'clipanion'

import { resolveWorkspaceInvocation } from '@atls/raijin/commands'
import { getChangedFiles }            from '@atls/yarn-plugin-files'

import { getChangedWorkspaces }       from './get-changed-workspaces.util.js'
import { createForeachInput }         from './workspaces-changed-foreach.input.js'

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

  async execute(): Promise<number> {
    const { yarn } = await resolveWorkspaceInvocation(this.context.cwd, this.context.plugins)
    const { configuration, project } = yarn

    const files = await getChangedFiles(project, this.since)
    const workspaces = getChangedWorkspaces(project, files)

    if (!workspaces.length) {
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
      workspaces.map((ws) => structUtils.stringifyIdent(ws.anchoredLocator)),
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

    return this.cli.run([...input, this.commandName, ...this.args], {
      cwd: project.cwd,
    })
  }
}

export { WorkspacesChangedForeachCommand }
