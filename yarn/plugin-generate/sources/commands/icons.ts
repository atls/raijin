import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'

import { generate }                     from '@atls/raijin/application/icons/generation'
import { createCommandInput }           from '@atls/raijin/commands'
import { toNativeCwd }                  from '@atls/raijin/commands'
import { createOutputReplacer }         from '@atls/raijin/infrastructure/providers/node/icons'
import { createSourceReader }           from '@atls/raijin/infrastructure/providers/node/icons'
import { createTransformer }            from '@atls/raijin/infrastructure/providers/svgr/icons'
import { getWorkspacePackageNames }     from '@atls/raijin/project'
import { formatProjectSources }         from '@atls/yarn-plugin-format'
import { lintProjectSources }           from '@atls/yarn-plugin-lint'

import { presentIconGeneration }        from '../presenters/icons.js'
import { presentIconGenerationError }   from '../presenters/icons.js'

export class GenerateIconsCommand extends BaseCommand {
  static override paths = [['ui', 'icons', 'generate']]

  static override usage = BaseCommand.Usage({
    description: 'generate icon components from source assets',
  })

  native: boolean = Option.Boolean('-n,--native', false)

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    const { executionCwd, project, yarn } = this.context.invocation
    const cwd = toNativeCwd(executionCwd)
    const rootCwd = toNativeCwd(project.cwd)

    try {
      const result = await generate(
        { cwd, native: this.native },
        {
          formatter: {
            format: async (files) => {
              try {
                await formatProjectSources({
                  cwd,
                  targets: createCommandInput({
                    cwd: executionCwd,
                    source: 'generated',
                    targets: Array.from(files),
                  }),
                  workspacePackageNames: getWorkspacePackageNames(yarn.project),
                })

                return 0
              } catch (error) {
                await presentIconGenerationError(this.context, yarn.configuration, error)

                return 1
              }
            },
          },
          linter: {
            lint: async (files) =>
              (
                await lintProjectSources({
                  rootCwd,
                  cwd,
                  targets: files,
                  fix: true,
                })
              ).terminal.exitCode,
          },
          output: createOutputReplacer(),
          sources: createSourceReader(),
          transformer: createTransformer(cwd),
        }
      )

      return presentIconGeneration(this.context, yarn.configuration, result)
    } catch (error) {
      return presentIconGenerationError(this.context, yarn.configuration, error)
    }
  }
}
