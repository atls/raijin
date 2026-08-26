import type { ProjectCommandContext }              from '@atls/raijin/commands'
import type { ProjectInvocation }                  from '@atls/raijin/commands'
import type { ChangedWorkspaceIdentity }           from '@atls/yarn-plugin-files'
import type { Workspace }                          from '@yarnpkg/core'

import type { Annotation }                         from './github.checks.js'

import { BaseCommand }                             from '@yarnpkg/cli'
import { MessageName }                             from '@yarnpkg/core'
import { StreamReport }                            from '@yarnpkg/core'
import { ppath }                                   from '@yarnpkg/fslib'
import { Command }                                 from 'clipanion'
import { Option }                                  from 'clipanion'
import stripAnsi                                   from 'strip-ansi'

import { formatChangedStateManagedError }          from '@atls/yarn-plugin-files'
import { resolveChangedProjectStateForEntrypoint } from '@atls/yarn-plugin-files'
import { resolveProjectWorkspaces }                from '@atls/yarn-plugin-files'
import { toWorkspaceIdentity }                     from '@atls/yarn-plugin-files'
import { readGitHubActionsEvent }                  from '@atls/yarn-plugin-files'
import { createForeachInput }                      from '@atls/yarn-plugin-workspaces'
import { expandWorkspaceDependents }               from '@atls/yarn-plugin-workspaces'

import { GitHubChecks }                            from './github.checks.js'
import { AnnotationLevel }                         from './github.checks.js'
import { isReleaseWorkspaceAllowed }               from './checks-release.config.js'
import { resolveChecksReleaseConfig }              from './checks-release.config.js'

export const createReleaseBuildArguments = (workspace: ChangedWorkspaceIdentity): Array<string> => [
  ...createForeachInput([workspace.path], {}),
  'run',
  'build',
]

class ChecksReleaseCommand extends BaseCommand {
  static override paths = [['checks', 'release']]

  static override usage = Command.Usage({
    description: 'run the release GitHub check for changed workspaces',
    details: `
      By default this keeps the existing release check behavior and builds every changed workspace with a build script.
      Use --no-private or top-level package.json tools.checks.release.privateWorkspaces=false
      when private application workspaces should not participate in release checks.
      Set top-level package.json tools.checks.release=false to disable this check from checks run.
    `,
  })

  noPrivate = Option.Boolean('--no-private', false)

  declare context: ProjectCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { yarn } = invocation
    const { project } = yarn

    const releaseConfig = resolveChecksReleaseConfig(project)
    const effectiveReleaseConfig = {
      ...releaseConfig,
      privateWorkspaces: this.noPrivate ? false : releaseConfig.privateWorkspaces,
    }
    const checks = this.createGitHubChecks('Release')

    const { id: checkId } = await checks.start()

    try {
      let workspaces: Array<Workspace> = []

      if (releaseConfig.enabled) {
        const result = await this.resolveChangedProjectState(invocation)

        if (result.kind === 'error') {
          const summary = formatChangedStateManagedError(result)

          await checks.failure(
            {
              title: 'Release run failed',
              summary,
            },
            checkId
          )

          return this.reportManagedError(summary)
        }

        const state = expandWorkspaceDependents(project, result.state)

        workspaces = resolveProjectWorkspaces(project, state.workspaces).filter((workspace) =>
          isReleaseWorkspaceAllowed(workspace, effectiveReleaseConfig))
      }

      const annotations: Array<Annotation> = []

      for await (const workspace of workspaces) {
        if (workspace.manifest.scripts.get('build')) {
          const result = await yarn.capture(
            createReleaseBuildArguments(toWorkspaceIdentity(workspace)),
            { forwardOutput: true }
          )

          if (result.reason !== 'completed' || result.exitCode > 0) {
            annotations.push({
              annotation_level: AnnotationLevel.Failure,
              title: `Error release workspace ${
                workspace.manifest.raw.name ?? workspace.relativeCwd
              }`,
              message:
                result.reason === 'completed'
                  ? `Exit code ${result.exitCode}`
                  : `Process ${result.reason}`,
              raw_details: stripAnsi([result.stdout, result.stderr].filter(Boolean).join('\n')),
              path: ppath.join(workspace.relativeCwd, 'package.json'),
              start_line: 1,
              end_line: 1,
            })
          }
        }
      }

      await checks.complete(checkId, {
        title: annotations.length > 0 ? `Errors ${annotations.length}` : 'Successful',
        summary:
          annotations.length > 0 ? `Found ${annotations.length} errors` : 'All checks passed',
        annotations,
      })

      return 0
    } catch (error) {
      const summary = error instanceof Error ? error.message : String(error)

      await checks.failure(
        {
          title: 'Release run failed',
          summary,
        },
        checkId
      )

      return this.reportManagedError(summary)
    }
  }

  protected createGitHubChecks(name: string): GitHubChecks {
    return new GitHubChecks(name)
  }

  protected async resolveChangedProjectState(invocation: ProjectInvocation) {
    return resolveChangedProjectStateForEntrypoint({
      processInvocation: invocation.process,
      project: invocation.yarn.project,
      source: { kind: 'github-event', event: readGitHubActionsEvent() },
    })
  }

  protected async reportManagedError(summary: string): Promise<number> {
    const commandReport = await StreamReport.start(
      {
        configuration: this.context.invocation.yarn.configuration,
        stdout: this.context.stdout,
      },
      async (report) => {
        report.reportError(MessageName.UNNAMED, summary)
      }
    )

    return commandReport.exitCode()
  }
}

export { ChecksReleaseCommand }
