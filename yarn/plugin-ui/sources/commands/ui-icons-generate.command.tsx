import type { CommandInput }        from '@atls/raijin/commands'
import type { WorkspaceInvocation } from '@atls/raijin/commands'
import type { PortablePath }        from '@yarnpkg/fslib'

import { BaseCommand }              from '@yarnpkg/cli'
import { ppath }                    from '@yarnpkg/fslib'
import { Option }                   from 'clipanion'
import { render }                   from 'ink'
import React                        from 'react'

import { ErrorInfo }                from '@atls/cli-ui-error-info-component'
import { IconsProgress }            from '@atls/cli-ui-icons-progress-component'
import { Icons }                    from '@atls/code-icons'
import { renderStatic }             from '@atls/cli-ui-renderer-static-component'
import { createCommandInput }       from '@atls/raijin/commands'
import { defineCommandInvocation }  from '@atls/raijin/commands'
import { toNativeCwd }              from '@atls/raijin/commands'
import { toCommandArguments }       from '@atls/raijin/commands'
import { discoverFiles }            from '@atls/raijin/filesystem'

export const createGeneratedIconInput = (
  workspaceCwd: PortablePath,
  files: Array<string>
): CommandInput =>
  createCommandInput({
    cwd: workspaceCwd,
    source: 'generated',
    targets: files.map((file) => `src/${file}`),
  })

export const discoverGeneratedIconFiles = async (
  workspaceCwd: PortablePath
): Promise<Array<string>> =>
  (
    await discoverFiles({
      cwd: ppath.join(workspaceCwd, 'src'),
      patterns: ['*.tsx'],
    })
  ).map((file) => ppath.basename(file))

export class UiIconsGenerateCommand extends BaseCommand {
  static override paths = [['ui', 'icons', 'generate']]

  static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

  static override usage = BaseCommand.Usage({
    description: 'generate icon components from source assets',
  })

  native: boolean = Option.Boolean('-n, --native', false)

  override async execute(invocation?: WorkspaceInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

    const { executionCwd, project, yarn } = invocation
    const cwd = toNativeCwd(executionCwd)

    const icons = await Icons.initialize(cwd)

    const { clear } = render(<IconsProgress icons={icons} />)

    try {
      await icons.generate({ native: this.native })

      const files = await discoverGeneratedIconFiles(executionCwd)

      const input = createGeneratedIconInput(executionCwd, files)
      const generatedFiles = toCommandArguments(input, project.cwd)

      await yarn.execute(['format', ...generatedFiles])
      await yarn.execute(['lint', '--fix', ...generatedFiles])

      return 0
    } catch (error) {
      if (error instanceof Error) {
        renderStatic(<ErrorInfo error={error} />)
          .split('\n')
          .forEach((line) => {
            console.error(line) // eslint-disable-line no-console
          })
      } else {
        console.error(error) // eslint-disable-line no-console
      }

      return 1
    } finally {
      clear()
    }
  }
}
