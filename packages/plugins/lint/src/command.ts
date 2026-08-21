import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'

import { createCommandInput }           from '@atls/raijin/commands'
import { toNativeCwd }                  from '@atls/raijin/commands'
import { toNativePath }                 from '@atls/raijin/filesystem'

import { writeLintException }           from './exception-output.js'
import { lintProjectSources }           from './project.js'
import { writeLintResult }              from './result-output.js'

export class LintCommand extends BaseCommand {
  static override paths = [['lint']]

  static override usage = BaseCommand.Usage({
    description: 'lint project files',
  })

  declare context: WorkspaceCommandContext

  fix = Option.Boolean('--fix')

  files: Array<string> = Option.Rest({ required: 0 })

  cache: boolean = Option.Boolean('--cache', false)

  override async execute(): Promise<number> {
    try {
      const { executionCwd, invocationCwd, project } = this.context.invocation
      const input = createCommandInput({
        cwd: invocationCwd,
        source: 'explicit',
        targets: this.files,
      })
      const result = await lintProjectSources({
        rootCwd: toNativeCwd(project.cwd),
        cwd: toNativeCwd(executionCwd),
        targets:
          input.targets.length > 0
            ? input.targets.map(({ path }) => toNativePath(path))
            : undefined,
        fix: this.fix,
        cache: this.cache,
      })

      writeLintResult(this.context, result)

      return result.terminal.exitCode
    } catch (error) {
      writeLintException(this.context, error)

      return 1
    }
  }
}
