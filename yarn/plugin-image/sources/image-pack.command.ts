import type { TagPolicy } from '@atls/code-pack'
import type { Workspace } from '@yarnpkg/core'

import { readFileSync }   from 'node:fs'

import { BaseCommand }    from '@yarnpkg/cli'
import { Configuration }  from '@yarnpkg/core'
import { Project }        from '@yarnpkg/core'
import { StreamReport }   from '@yarnpkg/core'
import { structUtils }    from '@yarnpkg/core'
import { xfs }            from '@yarnpkg/fslib'
import { Option }         from 'clipanion'
import { join }           from 'path'

import { pack }           from '@atls/code-pack'
import { packUtils }      from '@atls/yarn-pack-utils'

class ImagePackCommand extends BaseCommand {
  static override paths = [['image', 'pack']]

  registry: string = Option.String('-r,--registry', '')

  tagPolicy: TagPolicy = Option.String('-t,--tag-policy', 'revision')

  publish: boolean = Option.Boolean('-p,--publish', false)

  platform?: string = Option.String('--platform')

  async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)

    const { project } = await Project.find(configuration, this.context.cwd)

    const workspace: Workspace = project.getWorkspaceByFilePath(this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        configuration,
        stdout: this.context.stdout,
      },
      async (report) => {
        if (!this.isWorkspaceAllowedForBundle(workspace)) {
          report.reportInfo(
            null,
            `Workspace ${
              workspace.manifest.name
                ? structUtils.prettyIdent(configuration, workspace.manifest.name)
                : workspace.relativeCwd
            } not allowed for package.`
          )

          return
        }
        const destination = await xfs.mktempPromise()

        report.reportInfo(
          null,
          `Package workspace ${
            workspace.manifest.name
              ? structUtils.prettyIdent(configuration, workspace.manifest.name)
              : workspace.relativeCwd
          } to ${destination}`
        )

        const content = readFileSync(join(this.context.cwd, 'package.json'), 'utf-8')
        const { packConfiguration = {} } = JSON.parse(content)
        const buildpackVersion = packConfiguration.buildpackVersion ?? '0.1.1'
        const builderTag = packConfiguration.builderTag ?? '22'
        const { require } = packConfiguration

        await packUtils.pack(configuration, project, workspace, report, destination)

        await pack(
          {
            workspace: workspace.manifest.raw.name,
            registry: this.registry,
            publish: this.publish,
            tagPolicy: this.tagPolicy,
            buildpack: `atlantislab/buildpack-yarn-workspace:${buildpackVersion}`,
            builder: `atlantislab/builder-base:${builderTag}`,
            platform: this.platform,
            require,
            cwd: destination,
          },
          this.context
        )
      }
    )

    return commandReport.exitCode()
  }

  private isWorkspaceAllowedForBundle(workspace: Workspace): boolean {
    const { scripts, name } = workspace.manifest

    const buildCommand = scripts.get('build')

    const hasAllowedBuildScript = [
      'actl service build',
      'actl renderer build',
      'build-storybook',
      'storybook build',
      'next build',
      'builder build library',
      'app service build',
      'app renderer build',
      'service build',
      'renderer build',
      'strapi build',
    ].some((command) => buildCommand?.includes(command))

    return hasAllowedBuildScript && Boolean(name)
  }
}

export { ImagePackCommand }
