import type { CommandPath }                  from '@atls/raijin/commands'
import type { Project }                      from '@yarnpkg/core'

import { isAbsolute }                        from 'node:path'
import { relative }                          from 'node:path'
import { resolve }                           from 'node:path'

import { BaseCommand }                       from '@yarnpkg/cli'
import { ppath }                             from '@yarnpkg/fslib'
import { xfs }                               from '@yarnpkg/fslib'
import { Option }                            from 'clipanion'
import { render }                            from 'ink'
import React                                 from 'react'

import { ErrorInfo }                         from '@atls/cli-ui-error-info-component'
import { TypeScriptDiagnostic }              from '@atls/cli-ui-typescript-diagnostic-component'
import { TypeScriptProgress }                from '@atls/cli-ui-typescript-progress-component'
import { TypeScript }                        from '@atls/code-typescript'
import { renderStatic }                      from '@atls/cli-ui-renderer-static-component'
import { resolveWorkspaceCommandInvocation } from '@atls/raijin/commands'
import { executeWorkspaceCommandProxy }      from '@atls/raijin/commands'
import { shouldExecuteCommandProxy }         from '@atls/raijin/commands'
import { createProjectModel }                from '@atls/raijin/project'

export class TypeCheckCommand extends BaseCommand {
  static override paths = [['typecheck']]

  args: Array<string> = Option.Rest({ required: 0 })

  override async execute(): Promise<number> {
    if (shouldExecuteCommandProxy()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    return executeWorkspaceCommandProxy({
      args: ['typecheck', ...this.args],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const { cwd, project } = await resolveWorkspaceCommandInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const typecheckCwd = await this.resolveTypecheckCwd(cwd.execution, cwd.project)

    const typescript = await TypeScript.initialize(typecheckCwd.native, {
      manifestCwds: [cwd.project.native, typecheckCwd.native],
    })

    const { clear } = render(<TypeScriptProgress typescript={typescript} />)

    try {
      const diagnostics = await typescript.check(
        await this.getIncludes(project, cwd.invocation, typecheckCwd)
      )

      diagnostics.forEach((diagnostic) => {
        renderStatic(<TypeScriptDiagnostic {...diagnostic} />)
          .split('\n')
          .forEach((line) => {
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

  protected async resolveTypecheckCwd(
    workspaceCwd: CommandPath,
    projectCwd: CommandPath
  ): Promise<CommandPath> {
    if (await xfs.existsPromise(ppath.join(workspaceCwd.portable, 'tsconfig.json'))) {
      return workspaceCwd
    }

    return projectCwd
  }

  protected async getIncludes(
    project: Project,
    invocationCwd: CommandPath,
    typecheckCwd: CommandPath
  ): Promise<Array<string> | undefined> {
    if (this.args.length > 0) {
      const cwdRoot = typecheckCwd.native
      const cwd = invocationCwd.native

      return this.args.map((target) =>
        isAbsolute(target) ? relative(cwdRoot, target) : relative(cwdRoot, resolve(cwd, target)))
    }

    if (await xfs.existsPromise(ppath.join(typecheckCwd.portable, 'tsconfig.json'))) {
      return undefined
    }

    return createProjectModel(project).workspacePatterns
  }
}
