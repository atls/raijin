import type { CommandInput }          from '@atls/raijin/commands'
import type { Project }               from '@yarnpkg/core'
import type { PortablePath }          from '@yarnpkg/fslib'

import { BaseCommand }                from '@yarnpkg/cli'
import { Option }                     from 'clipanion'
import { render }                     from 'ink'
import React                          from 'react'

import { ErrorInfo }                  from '@atls/cli-ui-error-info-component'
import { TypeScriptDiagnostic }       from '@atls/cli-ui-typescript-diagnostic-component'
import { TypeScriptProgress }         from '@atls/cli-ui-typescript-progress-component'
import { TypeScript }                 from '@atls/code-typescript'
import { renderStatic }               from '@atls/cli-ui-renderer-static-component'
import { createCommandInput }         from '@atls/raijin/commands'
import { resolveProjectInvocation }   from '@atls/raijin/commands'
import { resolveWorkspaceInvocation } from '@atls/raijin/commands'
import { proxyWorkspaceCommand }      from '@atls/raijin/commands'
import { shouldProxyCommand }         from '@atls/raijin/commands'
import { toNativeCwd }                from '@atls/raijin/commands'
import { toCommandArguments }         from '@atls/raijin/commands'
import { hasTypeScriptProject }       from '@atls/raijin/config/typescript'

export class TypeCheckCommand extends BaseCommand {
  static override paths = [['typecheck']]

  args: Array<string> = Option.Rest({ required: 0 })

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    const { invocationCwd } = await resolveProjectInvocation(this.context.cwd, this.context.plugins)
    const input = createCommandInput({
      cwd: invocationCwd,
      source: 'explicit',
      targets: this.args,
    })

    return proxyWorkspaceCommand({
      args: ['typecheck', ...toCommandArguments(input)],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const { executionCwd, invocationCwd, project, yarn } = await resolveWorkspaceInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const typecheckCwd = await this.resolveTypecheckCwd(executionCwd, project.cwd)
    const nativeTypecheckCwd = toNativeCwd(typecheckCwd)

    const typescript = await TypeScript.initialize(nativeTypecheckCwd, {
      manifestCwds: [toNativeCwd(project.cwd), nativeTypecheckCwd],
    })

    const { clear } = render(<TypeScriptProgress typescript={typescript} />)

    try {
      const diagnostics = await typescript.check(
        await this.getIncludes(yarn.project, project.workspacePatterns, invocationCwd, typecheckCwd)
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
    workspaceCwd: PortablePath,
    projectCwd: PortablePath
  ): Promise<PortablePath> {
    if (hasTypeScriptProject(toNativeCwd(workspaceCwd))) {
      return workspaceCwd
    }

    return projectCwd
  }

  protected async getIncludes(
    project: Project,
    workspacePatterns: Array<string>,
    invocationCwd: PortablePath,
    typecheckCwd: PortablePath
  ): Promise<CommandInput | undefined> {
    if (this.args.length > 0) {
      return createCommandInput({
        cwd: invocationCwd,
        source: 'explicit',
        targets: this.args,
      })
    }

    return hasTypeScriptProject(toNativeCwd(typecheckCwd))
      ? undefined
      : createCommandInput({
          cwd: typecheckCwd,
          source: 'generated',
          targets: workspacePatterns,
        })
  }
}
