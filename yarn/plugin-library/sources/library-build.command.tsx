import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { rm }                           from 'node:fs/promises'
import { join }                         from 'node:path'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'
import { render }                       from 'ink'
import React                            from 'react'

import { ErrorInfo }                    from '@atls/cli-ui-error-info-component'
import { TypeScriptDiagnostic }         from '@atls/cli-ui-typescript-diagnostic-component'
import { TypeScriptProgress }           from '@atls/cli-ui-typescript-progress-component'
import { TypeScript }                   from '@atls/code-typescript'
import { renderStatic }                 from '@atls/cli-ui-renderer-static-component'
import { toNativeCwd }                  from '@atls/raijin/commands'

export class LibraryBuildCommand extends BaseCommand {
  static override paths = [['library', 'build']]

  static override usage = BaseCommand.Usage({
    description: 'build a library workspace',
  })

  target = Option.String('-t,--target', './dist')

  declare context: WorkspaceCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { executionCwd } = invocation
    const cwd = toNativeCwd(executionCwd)

    await this.cleanTarget(cwd)

    const typescript = await TypeScript.initialize(cwd)

    const { clear } = render(<TypeScriptProgress typescript={typescript} />)

    try {
      const diagnostics = await typescript.build([join(cwd, './src')], {
        outDir: join(cwd, this.target),
        declaration: true,
      })

      diagnostics.forEach((diagnostic) => {
        const output = renderStatic(<TypeScriptDiagnostic {...diagnostic} />)

        output.split('\n').forEach((line) => {
          console.log(line) // eslint-disable-line no-console
        })
      })

      return diagnostics.length === 0 ? 0 : 1
    } catch (error) {
      renderStatic(<ErrorInfo error={error as Error} />)
        .split('\n')
        .forEach((line) => {
          console.error(line) // eslint-disable-line no-console
        })

      return 1
    } finally {
      clear()
    }
  }

  protected async cleanTarget(workspaceCwd: string): Promise<void> {
    try {
      await rm(join(workspaceCwd, this.target), { recursive: true, force: true })
      // eslint-disable-next-line no-empty
    } catch {}
  }
}
