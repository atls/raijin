import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import { BaseCommand }                  from '@yarnpkg/cli'
import { Option }                       from 'clipanion'

import { createCommandInput }           from '@atls/raijin/commands'
import { toNativeCwd }                  from '@atls/raijin/commands'
import { toNativePath }                 from '@atls/raijin/filesystem'

import { writeTypecheckResult }         from './presenters/result.jsx'
import { typecheckProjectSources }      from './typecheck.js'

export class TypeCheckCommand extends BaseCommand {
  static override paths = [['typecheck']]

  static override usage = BaseCommand.Usage({
    description: 'type-check project sources',
  })

  declare context: WorkspaceCommandContext

  args: Array<string> = Option.Rest({ required: 0 })

  override async execute(): Promise<number> {
    const { executionCwd, invocationCwd, project, workspace } = this.context.invocation

    try {
      const input = createCommandInput({
        cwd: invocationCwd,
        source: 'explicit',
        targets: this.args,
      })
      const result = await typecheckProjectSources({
        cwd: toNativeCwd(executionCwd),
        manifestPolicySources: [project.topLevelWorkspace, workspace].map(({ cwd, manifest }) => ({
          cwd: toNativeCwd(cwd),
          ...(Object.hasOwn(manifest.raw, 'typecheckSkipLibCheck')
            ? { typecheckSkipLibCheck: manifest.raw.typecheckSkipLibCheck }
            : {}),
        })),
        rootCwd: toNativeCwd(project.cwd),
        targets:
          input.targets.length > 0
            ? input.targets.map(({ path, request }) => ({
                path: toNativePath(path),
                request,
              }))
            : undefined,
      })

      writeTypecheckResult(this.context, result)

      return result.terminal.exitCode
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)

      this.context.stderr.write(`${message}\n`)

      return 1
    }
  }
}
