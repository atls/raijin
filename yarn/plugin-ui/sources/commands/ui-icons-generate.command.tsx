import { join }                              from 'node:path'

import { BaseCommand }                       from '@yarnpkg/cli'
import { Option }                            from 'clipanion'
import { globby }                            from 'globby'
import { render }                            from 'ink'
import React                                 from 'react'

import { ErrorInfo }                         from '@atls/cli-ui-error-info-component'
import { IconsProgress }                     from '@atls/cli-ui-icons-progress-component'
import { Icons }                             from '@atls/code-icons'
import { renderStatic }                      from '@atls/cli-ui-renderer-static-component'
import { executeWorkspaceCommandProxy }      from '@atls/raijin/commands'
import { resolveWorkspaceCommandInvocation } from '@atls/raijin/commands'
import { shouldExecuteCommandProxy }         from '@atls/raijin/commands'

export const createGeneratedIconTargets = (
  workspaceCwd: string,
  files: Array<string>
): Array<string> => files.map((file) => join(workspaceCwd, 'src', file))

export class UiIconsGenerateCommand extends BaseCommand {
  static override paths = [['ui', 'icons', 'generate']]

  native: boolean = Option.Boolean('-n, --native', false)

  override async execute(): Promise<number> {
    if (shouldExecuteCommandProxy()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    const args: Array<string> = []

    if (this.native) {
      args.push('--native')
    }

    return executeWorkspaceCommandProxy({
      args: ['ui', 'icons', 'generate', ...args],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const { cwd } = await resolveWorkspaceCommandInvocation(this.context.cwd, this.context.plugins)

    const icons = await Icons.initialize(cwd.execution.native)

    const { clear } = render(<IconsProgress icons={icons} />)

    try {
      await icons.generate({ native: this.native })

      const files = await globby('*.tsx', {
        cwd: join(cwd.execution.native, 'src'),
      })

      const generatedFiles = createGeneratedIconTargets(cwd.execution.native, files)

      await this.cli.run(['format', ...generatedFiles], {
        cwd: cwd.project.portable,
      })
      await this.cli.run(['lint', '--fix', ...generatedFiles], {
        cwd: cwd.project.portable,
      })

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
