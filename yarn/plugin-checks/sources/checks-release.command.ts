import { BaseCommand }           from '@yarnpkg/cli'
import { Configuration }         from '@yarnpkg/core'
import { Project }               from '@yarnpkg/core'
import { ppath }                 from '@yarnpkg/fslib'
import stripAnsi                 from 'strip-ansi'

import { PassThroughRunContext } from '@atls/yarn-run-utils'
import { getChangedFiles }       from '@atls/yarn-plugin-files'
import { getChangedWorkspaces }  from '@atls/yarn-workspace-utils'

import { GitHubChecks }          from './github.checks.js'
import { AnnotationLevel }       from './github.checks.js'
import { Annotation }            from './github.checks.js'

class ChecksReleaseCommand extends BaseCommand {
  static paths = [['checks', 'release']]

  async execute() {
    const { project } = await Project.find(
      await Configuration.find(this.context.cwd, this.context.plugins),
      this.context.cwd
    )

    const workspaces = getChangedWorkspaces(project, await getChangedFiles(project))

    const checks = new GitHubChecks('Release')

    // @ts-expect-error any
    const { id: checkId } = await checks.start()

    try {
      const annotations: Array<Annotation> = []

      for await (const workspace of workspaces) {
        if (workspace.manifest.scripts.get('build')) {
          const context = new PassThroughRunContext()

          const outputWriter = (data: any) => this.context.stdout.write(data)

          context.stdout.on('data', outputWriter)
          context.stderr.on('data', outputWriter)

          const code = await this.cli.run(
            ['workspace', workspace.manifest.raw.name, 'build'],
            context
          )

          if (code > 0) {
            annotations.push({
              annotation_level: AnnotationLevel.Failure,
              title: `Error release workspace ${workspace.manifest.raw.name}`,
              message: `Exit code ${code}`,
              raw_details: stripAnsi(context.output),
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
      await checks.failure({
        title: 'Release run failed',
        summary: (error as any).message,
      })
    }
  }
}

export { ChecksReleaseCommand }
