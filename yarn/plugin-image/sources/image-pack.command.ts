import type { TagPolicy }                    from '@atls/code-pack'
import type { Workspace }                    from '@yarnpkg/core'

import type { ImagePackConfiguration }       from './image-pack.utils.js'

import { readFileSync }                      from 'node:fs'
import { join }                              from 'node:path'

import { BaseCommand }                       from '@yarnpkg/cli'
import { StreamReport }                      from '@yarnpkg/core'
import { structUtils }                       from '@yarnpkg/core'
import { xfs }                               from '@yarnpkg/fslib'
import { Option }                            from 'clipanion'

import { pack }                              from '@atls/code-pack'
import { resolveWorkspaceCommandInvocation } from '@atls/raijin/commands'
import { packUtils }                         from '@atls/yarn-pack-utils'

import { getDefaultMaterializationPlatform } from './image-pack.utils.js'
import { resolveBuildpackReference }         from './image-pack.utils.js'
import { resolveBuilderReference }           from './image-pack.utils.js'

class ImagePackCommand extends BaseCommand {
  static override paths = [['image', 'pack']]

  registry: string = Option.String('-r,--registry', '')

  tagPolicy: TagPolicy = Option.String('-t,--tag-policy', 'revision')

  publish: boolean = Option.Boolean('-p,--publish', false)

  platform?: string = Option.String('--platform')

  async execute(): Promise<number> {
    const { configuration, project, workspace, workspaceCwd } =
      await resolveWorkspaceCommandInvocation(this.context.cwd, this.context.plugins)

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

        // eslint-disable-next-line n/no-sync
        const content = readFileSync(join(workspaceCwd, 'package.json'), 'utf-8')
        const { packConfiguration = {} } = JSON.parse(content) as {
          packConfiguration?: ImagePackConfiguration
        }
        const { require } = packConfiguration

        await packUtils.pack(configuration, project, workspace, report, destination, {
          platform: this.platform ?? getDefaultMaterializationPlatform(),
        })

        await pack(
          {
            workspace: workspace.manifest.raw.name,
            registry: this.registry,
            publish: this.publish,
            tagPolicy: this.tagPolicy,
            buildpack: resolveBuildpackReference(packConfiguration),
            builder: resolveBuilderReference(packConfiguration),
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
      'astro build',
    ].some((command) => buildCommand?.includes(command))

    return hasAllowedBuildScript && Boolean(name)
  }
}

export { ImagePackCommand }
