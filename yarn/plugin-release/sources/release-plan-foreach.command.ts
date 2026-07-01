import type { ReleasePlan }       from './release-plan.utils.js'

import { BaseCommand }            from '@yarnpkg/cli'
import { WorkspaceRequiredError } from '@yarnpkg/cli'
import { Configuration }          from '@yarnpkg/core'
import { Project }                from '@yarnpkg/core'
import { ppath }                  from '@yarnpkg/fslib'
import { xfs }                    from '@yarnpkg/fslib'
import { Command }                from 'clipanion'
import { Option }                 from 'clipanion'

import { parseReleasePlan }       from './release-plan.utils.js'

export interface ReleasePlanForeachOptions {
  exclude?: string
  verbose?: boolean
  parallel?: boolean
  interlaced?: boolean
  publicOnly?: boolean
  topological?: boolean
  topologicalDev?: boolean
  jobs?: string
  publishableOnly?: boolean
}

const DEFAULT_RELEASE_PLAN_PATH = '.raijin/release-plan.json'

export const createReleasePlanForeachInput = (
  plan: ReleasePlan,
  options: ReleasePlanForeachOptions
): Array<string> => {
  const workspaces = plan.workspaces.filter(
    (workspace) =>
      workspace.decision !== 'decline' && (!options.publishableOnly || workspace.publishable)
  )

  if (workspaces.length === 0) {
    return []
  }

  const input = ['workspaces', 'foreach']

  for (const workspace of workspaces) {
    input.push('--include', workspace.ident)
  }

  input.push('--all')

  if (options.exclude) {
    input.push('--exclude', options.exclude)
  }

  if (options.verbose) {
    input.push('--verbose')
  }

  if (options.parallel) {
    input.push('--parallel')
  }

  if (options.interlaced) {
    input.push('--interlaced')
  }

  if (options.publicOnly) {
    input.push('--no-private')
  }

  if (options.topological) {
    input.push('--topological')
  }

  if (options.topologicalDev) {
    input.push('--topological-dev')
  }

  if (options.jobs) {
    input.push('--jobs', options.jobs)
  }

  return input
}

export class ReleasePlanForeachCommand extends BaseCommand {
  static override paths = [['release', 'plan', 'foreach']]

  static override usage = Command.Usage({
    description: 'run a command for workspaces listed in a Raijin release plan',
    details: `
      This command routes the fixed release workspace selection through Yarn workspaces foreach.
      Empty plans are no-ops, never broad workspace execution.
    `,
  })

  plan = Option.String('--plan', DEFAULT_RELEASE_PLAN_PATH)

  exclude = Option.String('--exclude', '')

  verbose = Option.Boolean('-v,--verbose', false)

  parallel = Option.Boolean('-p,--parallel', false)

  interlaced = Option.Boolean('-i,--interlaced', false)

  publicOnly: boolean = Option.Boolean('--no-private', false)

  topological: boolean = Option.Boolean('-t,--topological', false)

  topologicalDev: boolean = Option.Boolean('--topological-dev', false)

  jobs?: string = Option.String('-j,--jobs')

  publishableOnly: boolean = Option.Boolean('--publishable', false)

  commandName = Option.String()

  args = Option.Proxy()

  override async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project, workspace } = await Project.find(configuration, this.context.cwd)

    if (!workspace) {
      throw new WorkspaceRequiredError(project.cwd, this.context.cwd)
    }

    const planPath = ppath.resolve(project.cwd, this.plan)
    const plan = parseReleasePlan(await xfs.readFilePromise(planPath, 'utf8'))
    const input = createReleasePlanForeachInput(plan, {
      exclude: this.exclude,
      verbose: this.verbose,
      parallel: this.parallel,
      interlaced: this.interlaced,
      publicOnly: this.publicOnly,
      topological: this.topological,
      topologicalDev: this.topologicalDev,
      jobs: this.jobs,
      publishableOnly: this.publishableOnly,
    })

    if (input.length === 0) {
      return 0
    }

    return this.cli.run([...input, this.commandName, ...this.args], {
      cwd: project.cwd,
    })
  }
}
