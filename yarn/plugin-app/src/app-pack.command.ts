import { BaseCommand }   from '@yarnpkg/cli'
import { Configuration } from '@yarnpkg/core'
import { Project }       from '@yarnpkg/core'
import { StreamReport }  from '@yarnpkg/core'
import { execUtils }     from '@yarnpkg/core'
import { Command }       from 'clipanion'

import { pack }          from '@atls/code-pack'
import { TagPolicy }     from '@atls/code-pack'

class AppPackCommand extends BaseCommand {
  @Command.String(`-r,--registry`)
  registry: string = ''

  @Command.String(`-t,--tag-policy`)
  tagPolicy: TagPolicy = 'revision'

  @Command.Boolean(`-p,--publish`)
  publish: boolean = false

  @Command.String(`--builder`)
  builder: string = ''

  @Command.String(`--buildpack`)
  buildpack: string = ''

  @Command.Path('app', 'pack')
  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const { project } = await Project.find(configuration, this.context.cwd)

    const workspace = project.getWorkspaceByFilePath(this.context.cwd)

    const { scripts, name } = workspace.manifest

    const buildCommand = scripts.get('build')

    const canBundle = [
      'actl service build',
      'actl renderer build',
      'build-storybook',
      'next build',
      'builder build library',
      'app service build',
      'app renderer build',
    ].some((command) => buildCommand?.includes(command))

    const report = await StreamReport.start(
      {
        configuration,
        stdout: this.context.stdout,
      },
      // eslint-disable-next-line no-shadow
      async (report) => {
        if (!(name && canBundle)) {
          report.reportInfo(
            null,
            `Workspace ${workspace.manifest.raw.name} not allowed for package.`
          )
        } else {
          await pack(
            {
              workspace: workspace.manifest.raw.name,
              registry: this.registry,
              publish: this.publish,
              tagPolicy: this.tagPolicy,
              buildpack: this.buildpack,
              builder: this.builder,
            },
            {
              env: process.env,
              cwd: project.cwd,
              stdin: this.context.stdin,
              stdout: this.context.stdout,
              stderr: this.context.stderr,
              end: execUtils.EndStrategy.ErrorCode,
            }
          )
        }
      }
    )

    return report.exitCode()
  }
}

export { AppPackCommand }
