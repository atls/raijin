import type { CommandExecutor }              from '@atls/code-pack'
import type { TagPolicy }                    from '@atls/code-pack'
import type { WorkspaceCommandContext }      from '@atls/raijin/commands'

import type { ImagePackConfiguration }       from './image-pack.utils.js'

import { readFileSync }                      from 'node:fs'
import { join }                              from 'node:path'

import { BaseCommand }                       from '@yarnpkg/cli'
import { MessageName }                       from '@yarnpkg/core'
import { StreamReport }                      from '@yarnpkg/core'
import { structUtils }                       from '@yarnpkg/core'
import { xfs }                               from '@yarnpkg/fslib'
import { Option }                            from 'clipanion'

import { pack }                              from '@atls/code-pack'
import { assertProcessCompleted }            from '@atls/raijin/commands'
import { toNativeCwd }                       from '@atls/raijin/commands'
import { packUtils }                         from '@atls/yarn-pack-utils'

import { getDefaultMaterializationPlatform } from './image-pack.utils.js'
import { resolveBuildpackReference }         from './image-pack.utils.js'
import { resolveBuilderReference }           from './image-pack.utils.js'
import { createPackResult }                  from './pack-result.js'
import { isWorkspaceEligibleForImage }       from './workspace-eligibility.js'

class ImagePackCommand extends BaseCommand {
  static override paths = [['image', 'pack']]

  static override usage = BaseCommand.Usage({
    description: 'build and optionally publish a container image',
  })

  registry: string = Option.String('-r,--registry', '')

  tagPolicy: TagPolicy = Option.String('-t,--tag-policy', 'revision')

  publish: boolean = Option.Boolean('-p,--publish', false)

  platform?: string = Option.String('--platform')

  json: boolean = Option.Boolean('--json', false)

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { executionCwd, process: processInvocation, workspace, yarn } = invocation
    const { configuration, project } = yarn
    const commandExecutor: CommandExecutor = {
      cwd: executionCwd,
      execute: async (command, args, options = {}) => {
        const result = await processInvocation.execute(
          command,
          args,
          options.capture
            ? {
                input: 'ignore',
                output: { mode: 'capture' },
              }
            : undefined
        )

        assertProcessCompleted(result)

        return {
          exitCode: result.exitCode,
          stderr: result.stderr,
          stdout: result.stdout,
        }
      },
    }

    const commandReport = await StreamReport.start(
      {
        configuration,
        json: this.json,
        stdout: this.context.stdout,
      },
      async (report) => {
        if (!isWorkspaceEligibleForImage(workspace)) {
          report.reportError(
            MessageName.UNNAMED,
            `Workspace ${
              workspace.manifest.name
                ? structUtils.stringifyIdent(workspace.manifest.name)
                : workspace.relativeCwd
            } is not eligible for image publication.`
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
        const content = readFileSync(join(toNativeCwd(executionCwd), 'package.json'), 'utf-8')
        const { packConfiguration = {} } = JSON.parse(content) as {
          packConfiguration?: ImagePackConfiguration
        }
        const { require } = packConfiguration

        await packUtils.pack(configuration, project, workspace, report, destination, {
          platform: this.platform ?? getDefaultMaterializationPlatform(),
        })

        const result = createPackResult(
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
            commandExecutor
          ),
          this.publish
        )

        report.reportInfo(
          null,
          `${this.publish ? 'Published' : 'Built'} ${result.images.join(', ')}.`
        )
        report.reportJson(result)
      }
    )

    return commandReport.exitCode()
  }
}

export { ImagePackCommand }
