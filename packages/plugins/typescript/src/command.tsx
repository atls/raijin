import type { WorkspaceCommandContext } from '@atls/raijin/commands'
import type { PortablePath }            from '@yarnpkg/fslib'
import type { hasTypeScriptProject }    from '@atls/raijin/config/typescript'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'

import { createCommandInput }           from '@atls/raijin/commands'
import { toCommandArguments }           from '@atls/raijin/commands'
import { toNativeCwd }                  from '@atls/raijin/commands'

import { writeTypecheckResult }         from './presenters/result.jsx'
import { typecheckProjectSources }      from './project.js'

const TYPESCRIPT_CONFIG_SPECIFIER = '@atls/raijin/config/typescript'

const importTypeScriptConfig = async (): Promise<{
  hasTypeScriptProject: typeof hasTypeScriptProject
}> =>
  import(TYPESCRIPT_CONFIG_SPECIFIER) as Promise<{
    hasTypeScriptProject: typeof hasTypeScriptProject
  }>

export class TypeCheckCommand extends BaseCommand {
  static override paths = [['typecheck']]

  static override usage = BaseCommand.Usage({
    description: 'type-check project sources',
  })

  declare context: WorkspaceCommandContext

  args: Array<string> = Option.Rest({ required: 0 })

  override async execute(): Promise<number> {
    const { executionCwd, invocationCwd, project } = this.context.invocation

    try {
      const typecheckCwd = await this.resolveTypecheckCwd(executionCwd, project.cwd)
      const input = createCommandInput({
        cwd: invocationCwd,
        source: 'explicit',
        targets: this.args,
      })
      const result = await typecheckProjectSources({
        cwd: toNativeCwd(typecheckCwd),
        manifestCwds: [toNativeCwd(project.cwd), toNativeCwd(typecheckCwd)],
        targets: input.targets.length > 0 ? toCommandArguments(input, typecheckCwd) : undefined,
      })

      writeTypecheckResult(this.context, result)

      return result.terminal.exitCode
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)

      this.context.stderr.write(`${message}\n`)

      return 1
    }
  }

  protected async resolveTypecheckCwd(
    workspaceCwd: PortablePath,
    projectCwd: PortablePath
  ): Promise<PortablePath> {
    const { hasTypeScriptProject } = await importTypeScriptConfig()

    return hasTypeScriptProject(toNativeCwd(workspaceCwd)) ? workspaceCwd : projectCwd
  }
}
