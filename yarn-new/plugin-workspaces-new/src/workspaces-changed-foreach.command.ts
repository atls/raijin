import { BaseCommand }            from '@yarnpkg/cli'
import { WorkspaceRequiredError } from '@yarnpkg/cli'
import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { StreamReport }           from '@yarnpkg/core'
import { structUtils }            from '@yarnpkg/core'

import { Option }                 from 'clipanion'

import { getChangedFiles }        from '@atls/yarn-plugin-files-new'
import { getChangedWorkspaces }   from '@atls/yarn-workspace-utils-new'

class WorkspacesChangedForeachCommand extends BaseCommand {
  static paths = [['workspaces', 'changed', 'foreach']]

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

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const { project, workspace } = await Project.find(configuration, this.context.cwd)

    if (!workspace) {
      throw new WorkspaceRequiredError(project.cwd, this.context.cwd)
    }

    const files = await getChangedFiles(project)
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

    const input = ['workspaces', 'foreach']

    workspaces.forEach((ws) => {
      input.push('--include')
      input.push(structUtils.stringifyIdent(ws.anchoredLocator))
    })

    if (this.all) {
      input.push('--all')
    } else if (this.since.length > 0) {
      input.push('--since')
      input.push(this.since)
    } else if (this.workTree) {
      input.push('--worktree')
    }

    if (this.exclude) {
      input.push('--exclude')
      input.push(this.exclude)
    }

    if (this.verbose) {
      input.push('--verbose')
    }

    if (this.parallel) {
      input.push('--parallel')
    }

    if (this.interlaced) {
      input.push('--interlaced')
    }

    if (this.publicOnly) {
      input.push('--no-private')
    }

    if (this.topological) {
      input.push('--topological')
    }

    if (this.topologicalDev) {
      input.push('--topological-dev')
    }

    if (this.jobs) {
      input.push('--jobs')
    }

    return this.cli.run([...input, this.commandName, ...this.args], {
      cwd: project.cwd,
    })
  }
}

export { WorkspacesChangedForeachCommand }
