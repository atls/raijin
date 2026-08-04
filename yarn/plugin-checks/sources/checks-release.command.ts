import type { ProjectInvocation }     from '@atls/raijin/commands'

import type { Annotation }            from './github.checks.js'

import { ppath }                      from '@yarnpkg/fslib'
import { Command }                    from 'clipanion'
import { Option }                     from 'clipanion'
import stripAnsi                      from 'strip-ansi'

import { RaijinCommand }              from '@atls/raijin/commands'
import { getChangedFiles }            from '@atls/yarn-plugin-files'
import { getChangedWorkspaces }       from '@atls/yarn-plugin-workspaces'

import { GitHubChecks }               from './github.checks.js'
import { AnnotationLevel }            from './github.checks.js'
import { isReleaseWorkspaceAllowed }  from './checks-release.config.js'
import { resolveChecksReleaseConfig } from './checks-release.config.js'

export const createChecksReleaseArgs = (noPrivate: boolean): Array<string> => [
  'checks',
  'release',
  ...(noPrivate ? ['--no-private'] : []),
]

class ChecksReleaseCommand extends RaijinCommand {
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

  async executeProject(invocation: ProjectInvocation): Promise<number> {
    const { yarn } = invocation
    const { project } = yarn

    const releaseConfig = resolveChecksReleaseConfig(project)
    const effectiveReleaseConfig = {
      ...releaseConfig,
      privateWorkspaces: this.noPrivate ? false : releaseConfig.privateWorkspaces,
    }
    const workspaces = releaseConfig.enabled
      ? getChangedWorkspaces(project, await getChangedFiles(invocation.child)).filter((workspace) =>
          isReleaseWorkspaceAllowed(workspace, effectiveReleaseConfig))
      : []

    const checks = new GitHubChecks('Release')

    const { id: checkId } = await checks.start()

    try {
      const annotations: Array<Annotation> = []

      for await (const workspace of workspaces) {
        if (workspace.manifest.scripts.get('build')) {
          const result = await yarn.capture(
            ['workspace', workspace.manifest.raw.name as string, 'build'],
            { forwardOutput: true }
          )

          if (result.exitCode > 0) {
            annotations.push({
              annotation_level: AnnotationLevel.Failure,
              title: `Error release workspace ${
                workspace.manifest.raw.name ?? workspace.relativeCwd
              }`,
              message: `Exit code ${result.exitCode}`,
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
    } catch (error) {
      await checks.failure(
        {
          title: 'Release run failed',
          summary: error instanceof Error ? error.message : (error as string),
        },
        checkId
      )
    }

    return 0
  }
}

export { ChecksReleaseCommand }
