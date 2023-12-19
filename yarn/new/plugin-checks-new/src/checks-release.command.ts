import { BaseCommand }           from '@yarnpkg/cli'
import { Configuration }         from '@yarnpkg/core'
import { Project }               from '@yarnpkg/core'
import { ppath }                 from '@yarnpkg/fslib'
import { Filename }            from '@yarnpkg/fslib'

import stripAnsi                 from 'strip-ansi'

import { PassThroughRunContext } from '@atls/yarn-run-utils-new'
import { getChangedFiles }       from '@atls/yarn-plugin-files-new'
import { getChangedWorkspaces }  from '@atls/yarn-workspace-utils-new'

import { GitHubChecks }          from './github.checks'
import { AnnotationLevel }       from './github.checks'
import { Annotation }            from './github.checks'

class ChecksReleaseCommand extends BaseCommand {
  static paths = [['checks', 'release']]

  async execute() {
    const { project } = await Project.find(
      await Configuration.find(this.context.cwd, this.context.plugins),
      this.context.cwd
    )

    const workspaces = getChangedWorkspaces(project, await getChangedFiles(project))

    const checks = new GitHubChecks('Release')

    const { id: checkId } = await checks.start()

    try {
      const annotations: Array<Annotation> = []

      for await (const workspace of workspaces) {
        if (workspace.manifest.scripts.get('build')) {
          const context = new PassThroughRunContext()

          const outputWritter = (data) => this.context.stdout.write(data)

          context.stdout.on('data', outputWritter)
          context.stderr.on('data', outputWritter)

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
              path: ppath.join(workspace.relativeCwd, 'package.json' as Filename),
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
