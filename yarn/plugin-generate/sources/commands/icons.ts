import type { WorkspaceCommandContext } from '@atls/raijin/commands'
import type { PortablePath }            from '@yarnpkg/fslib'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'

import { generate }                     from '@atls/raijin/application/icons/generation'
import { createCommandInput }           from '@atls/raijin/commands'
import { toCommandArguments }           from '@atls/raijin/commands'
import { toNativeCwd }                  from '@atls/raijin/commands'
import { createOutputReplacer }         from '@atls/raijin/infrastructure/providers/icons/node'
import { createSourceReader }           from '@atls/raijin/infrastructure/providers/icons/node'
import { createTransformer }            from '@atls/raijin/infrastructure/providers/icons/svgr'

import { presentIconGeneration }        from '../presenters/icons.js'
import { presentIconGenerationError }   from '../presenters/icons.js'

const createGeneratedArguments = (cwd: PortablePath, files: ReadonlyArray<string>): Array<string> =>
  toCommandArguments(
    createCommandInput({
      cwd,
      source: 'generated',
      targets: Array.from(files),
    }),
    cwd
  )

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
    const createArguments = (files: ReadonlyArray<string>) =>
      createGeneratedArguments(executionCwd, files)

    try {
      const result = await generate(
        { cwd, native: this.native },
        {
          formatter: {
            format: async (files) => yarn.execute(['format', ...createArguments(files)]),
          },
          linter: {
            lint: async (files) => yarn.execute(['lint', '--fix', ...createArguments(files)]),
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
