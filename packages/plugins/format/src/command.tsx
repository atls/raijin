import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'

import { createCommandInput }           from '@atls/raijin/commands'
import { toNativeCwd }                  from '@atls/raijin/commands'
import { getWorkspacePackageNames }     from '@atls/raijin/project'

import { writeDiagnostic }              from './diagnostic.jsx'
import { formatProjectSources }         from './project.js'

export class FormatCommand extends BaseCommand {
  static override paths = [['format']]

  static override usage = BaseCommand.Usage({
    description: 'format project files',
  })

  declare context: WorkspaceCommandContext

  files: Array<string> = Option.Rest({ required: 0 })

  override async execute(): Promise<number> {
    try {
      const { executionCwd, invocationCwd, yarn } = this.context.invocation
      const targets = createCommandInput({
        cwd: invocationCwd,
        source: 'explicit',
        targets: this.files,
      })

      await formatProjectSources({
        cwd: toNativeCwd(executionCwd),
        targets: targets.targets.length > 0 ? targets : undefined,
        workspacePackageNames: getWorkspacePackageNames(yarn.project),
      })

      return 0
    } catch (error) {
      writeDiagnostic(this.context, error)

      return 1
    }
  }
}
