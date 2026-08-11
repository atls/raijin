import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'

import { generate }                     from '@atls/raijin/application/icons/generation'
import { toNativeCwd }                  from '@atls/raijin/commands'
import { createOutputReplacer }         from '@atls/raijin/infrastructure/providers/node/icons'
import { createSourceReader }           from '@atls/raijin/infrastructure/providers/node/icons'
import { createTransformer }            from '@atls/raijin/infrastructure/providers/svgr/icons'
import { createFormatter }              from '@atls/raijin/infrastructure/providers/yarn/icons'
import { createLinter }                 from '@atls/raijin/infrastructure/providers/yarn/icons'

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
    const { executionCwd, yarn } = this.context.invocation
    const cwd = toNativeCwd(executionCwd)

    try {
      const result = await generate(
        { cwd, native: this.native },
        {
          formatter: createFormatter(executionCwd, yarn.execute),
          linter: createLinter(executionCwd, yarn.execute),
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
