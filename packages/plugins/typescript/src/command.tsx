import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import type { TypecheckResult }          from './typecheck.js'

import { BaseCommand }                   from '@yarnpkg/cli'
import { Option }                        from 'clipanion'
import React                             from 'react'

import { TypeScriptDiagnostic }          from '@atls/cli-ui-typescript-diagnostic-component'
import { renderStatic }                  from '@atls/cli-ui-renderer-static-component'
import { createCommandInput }            from '@atls/raijin/commands'
import { toNativeCwd }                   from '@atls/raijin/commands'

import { typecheckProjectSources }       from './typecheck.js'

const writeTypecheckResult = (
  context: Pick<WorkspaceCommandContext, 'stderr' | 'stdout'>,
  result: TypecheckResult
): void => {
  if (result.kind === 'error') {
    const message =
      result.reason === 'invalid-policy'
        ? `Invalid typecheckSkipLibCheck in ${result.cwd}: expected boolean.`
        : `TypeScript project not found in ${result.cwd}; provide explicit files.`

    context.stderr.write(`${message}\n`)

    return
  }

  result.diagnostics.forEach((diagnostic) => {
    renderStatic(<TypeScriptDiagnostic {...diagnostic} />)
      .split('\n')
      .forEach((line) => {
        context.stdout.write(`${line}\n`)
      })
  })
}

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
        targets: input.targets.length > 0 ? input : undefined,
      })

      writeTypecheckResult(this.context, result)

      return result.kind === 'completed' ? result.exitCode : 1
    } catch (error) {
      const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)

      this.context.stderr.write(`${message}\n`)

      return 1
    }
  }
}
