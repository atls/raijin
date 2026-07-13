import type { Annotation }            from './github.checks.js'

import { BaseCommand }                from '@yarnpkg/cli'
import { ppath }                      from '@yarnpkg/fslib'
import { Command }                    from 'clipanion'
import { Option }                     from 'clipanion'
import stripAnsi                      from 'strip-ansi'

import { proxyProjectCommand }        from '@atls/raijin/commands'
import { resolveProjectInvocation }   from '@atls/raijin/commands'
import { shouldProxyCommand }         from '@atls/raijin/commands'
import { getChangedFiles }            from '@atls/yarn-plugin-files'
import { getChangedWorkspaces }       from '@atls/yarn-plugin-workspaces'

import { GitHubChecks }               from './github.checks.js'
import { AnnotationLevel }            from './github.checks.js'
import { PassThroughRunContext }      from './pass-through-run.context.js'
import { isReleaseWorkspaceAllowed }  from './checks-release.config.js'
import { resolveChecksReleaseConfig } from './checks-release.config.js'

export const createChecksReleaseProxyArgs = (noPrivate: boolean): Array<string> => [
  'checks',
  'release',
  ...(noPrivate ? ['--no-private'] : []),
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

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    return proxyProjectCommand({
      args: createChecksReleaseProxyArgs(this.noPrivate),
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const { yarn } = await resolveProjectInvocation(this.context.cwd, this.context.plugins)
    const { project } = yarn

    const releaseConfig = resolveChecksReleaseConfig(project)
    const effectiveReleaseConfig = {
      ...releaseConfig,
      privateWorkspaces: this.noPrivate ? false : releaseConfig.privateWorkspaces,
    }
    const workspaces = releaseConfig.enabled
      ? getChangedWorkspaces(project, await getChangedFiles(project)).filter((workspace) =>
          isReleaseWorkspaceAllowed(workspace, effectiveReleaseConfig))
      : []

    const checks = new GitHubChecks('Release')

    const { id: checkId } = await checks.start()

    try {
      const annotations: Array<Annotation> = []

      for await (const workspace of workspaces) {
        if (workspace.manifest.scripts.get('build')) {
          const context = new PassThroughRunContext()

          const outputWriter = (data: Buffer): ReturnType<typeof this.context.stdout.write> =>
            this.context.stdout.write(data)

          context.stdout.on('data', outputWriter)
          context.stderr.on('data', outputWriter)

          const code = await this.cli.run(
            ['workspace', workspace.manifest.raw.name as string, 'build'],
            context
          )

          if (code > 0) {
            annotations.push({
              annotation_level: AnnotationLevel.Failure,
              title: `Error release workspace ${
                workspace.manifest.raw.name ?? workspace.relativeCwd
              }`,
              message: `Exit code ${code}`,
              raw_details: stripAnsi(context.output),
              path: ppath.join(workspace.relativeCwd, 'package.json'),
              start_line: 1,
              end_line: 1,
            })
          }

          context.stdout.off('data', outputWriter)
          context.stderr.off('data', outputWriter)
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
