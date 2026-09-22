import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import type { CommandExecutor }         from './buildpack/interfaces/executor.js'
import type { TagPolicy }               from './buildpack/interfaces/pack.js'
import type { ImagePackConfiguration }  from './configuration.js'

import { BaseCommand }                  from '@yarnpkg/cli'
import { StreamReport }                 from '@yarnpkg/core'
import { MessageName }                  from '@yarnpkg/core'
import { structUtils }                  from '@yarnpkg/core'
import { Option }                       from 'clipanion'

import { assertProcessCompleted }       from '@atls/raijin/commands'

import { pack }                         from './buildpack/pack.js'
import { parseAdditionalTags }          from './configuration.js'
import { resolveBuildpackReference }    from './configuration.js'
import { resolveBuilderReference }      from './configuration.js'
import { isImageWorkspace }             from './eligibility.js'

class ImagePackCommand extends BaseCommand {
  static override paths = [['image', 'pack']]

  static override usage = BaseCommand.Usage({
    description: 'build and optionally publish a container image',
  })

  registry: string = Option.String('-r,--registry', '')

  tagPolicy: TagPolicy = Option.String('-t,--tag-policy', 'revision')

  tags: string = Option.String('--tags', '')

  tagSuffixes: string = Option.String('--tag-suffixes', '')

  publish: boolean = Option.Boolean('-p,--publish', false)

  platform?: string = Option.String('--platform')

  json: boolean = Option.Boolean('--json', false)

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    const { workspace, yarn, process: processInvocation } = this.context.invocation
    const { configuration, project } = yarn
    const commandExecutor: CommandExecutor = {
      cwd: project.cwd,
      execute: async (command, args, options = {}) => {
        const result = await processInvocation.project.execute(
          command,
          args,
          options.capture || this.json
            ? { input: 'ignore', output: { mode: 'capture' } }
            : undefined
        )

        assertProcessCompleted(result)

        return { exitCode: result.exitCode, stderr: result.stderr, stdout: result.stdout }
      },
    }

    const commandReport = await StreamReport.start(
      { configuration, stdout: this.context.stdout, json: this.json },
      async (report) => {
        if (!isImageWorkspace(workspace.manifest)) {
          report.reportError(
            MessageName.UNNAMED,
            `Workspace ${workspace.manifest.name ? structUtils.stringifyIdent(workspace.manifest.name) : workspace.relativeCwd} requires a name and a production start script for image packaging.`
          )

          return
        }

        if (!configuration.get('yarnPath')) {
          throw new Error('Image packaging requires the checked application yarnPath')
        }

        const packConfiguration =
          (workspace.manifest.raw.packConfiguration as ImagePackConfiguration | undefined) ?? {}
        const result = await pack(
          {
            workspace: structUtils.stringifyIdent(workspace.anchoredLocator),
            registry: this.registry,
            publish: this.publish,
            tagPolicy: this.tagPolicy,
            additionalTags: parseAdditionalTags(this.tags),
            tagSuffixes: parseAdditionalTags(this.tagSuffixes),
            buildpack: resolveBuildpackReference(packConfiguration),
            builder: resolveBuilderReference(packConfiguration),
            platform: this.platform,
            require: packConfiguration.require,
            cwd: project.cwd,
          },
          commandExecutor
        )

        if (this.json) {
          report.reportJson(result)
        } else {
          report.reportInfo(
            null,
            result.published
              ? `Published image ${result.digest}: ${result.tags.join(', ')}`
              : `Built image ${result.imageId}: ${result.tags.join(', ')}`
          )
        }
      }
    )

    return commandReport.exitCode()
  }
}

export { ImagePackCommand }
