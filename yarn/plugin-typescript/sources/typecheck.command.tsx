import type { Project }                   from '@yarnpkg/core'
import type { PortablePath }              from '@yarnpkg/fslib'

import { isAbsolute }                     from 'node:path'
import { relative }                       from 'node:path'
import { resolve }                        from 'node:path'

import { BaseCommand }                    from '@yarnpkg/cli'
import { Filename }                       from '@yarnpkg/fslib'
import { execUtils }                      from '@yarnpkg/core'
import { ppath }                          from '@yarnpkg/fslib'
import { xfs }                            from '@yarnpkg/fslib'
import { npath }                          from '@yarnpkg/fslib'
import { Option }                         from 'clipanion'
import { render }                         from 'ink'
import React                              from 'react'

import { ErrorInfo }                      from '@atls/cli-ui-error-info-component'
import { TypeScriptDiagnostic }           from '@atls/cli-ui-typescript-diagnostic-component'
import { TypeScriptProgress }             from '@atls/cli-ui-typescript-progress-component'
import { TypeScript }                     from '@atls/code-typescript'
import { COMMAND_PROXY_EXECUTION }        from '@atls/yarn-plugin-tools/command-context'
import { renderStatic }                   from '@atls/cli-ui-renderer-static-component'
import { createCommandProxyEnvironment }  from '@atls/yarn-plugin-tools/command-context'
import { resolveWorkspaceCommandContext } from '@atls/yarn-plugin-tools/command-context'
import { makeCurrentYarnExecutable }      from '@atls/yarn-plugin-tools/current-yarn-executable'
import { createProjectModel }             from '@atls/yarn-plugin-tools/project'

export class TypeCheckCommand extends BaseCommand {
  static override paths = [['typecheck']]

  args: Array<string> = Option.Rest({ required: 0 })

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular()
    }

    if (process.env[COMMAND_PROXY_EXECUTION] === 'true') {
      return this.executeRegular()
    }

    return this.executeProxy()
  }

  async executeProxy(): Promise<number> {
    const { project, workspaceCwd } = await resolveWorkspaceCommandContext(
      this.context.cwd,
      this.context.plugins
    )

    const binFolder = await xfs.mktempPromise()
    const { executable, env } = await makeCurrentYarnExecutable({
      binFolder,
      project,
      env: createCommandProxyEnvironment(this.context.cwd),
    })

    const { code } = await execUtils.pipevp(executable, ['typecheck', ...this.args], {
      cwd: workspaceCwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env,
    })

    return code
  }

  async executeRegular(): Promise<number> {
    const { project, invocationCwd, workspaceCwd } = await resolveWorkspaceCommandContext(
      this.context.cwd,
      this.context.plugins
    )
    const typecheckCwd = await this.resolveTypecheckCwd(project, workspaceCwd)

    const typescript = await TypeScript.initialize(typecheckCwd, {
      manifestCwds: [project.cwd, typecheckCwd],
    })

    const { clear } = render(<TypeScriptProgress typescript={typescript} />)

    try {
      const diagnostics = await typescript.check(
        await this.getIncludes(project, invocationCwd, typecheckCwd)
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
    project: Project,
    workspaceCwd: PortablePath
  ): Promise<PortablePath> {
    if (await xfs.existsPromise(ppath.join(workspaceCwd, 'tsconfig.json'))) {
      return workspaceCwd
    }

    return project.cwd
  }

  protected async getIncludes(
    project: Project,
    invocationCwd: PortablePath,
    typecheckCwd: PortablePath
  ): Promise<Array<string> | undefined> {
    if (this.args.length > 0) {
      const cwdRoot = npath.fromPortablePath(typecheckCwd)
      const cwd = npath.fromPortablePath(invocationCwd)

      return this.args.map((target) =>
        isAbsolute(target) ? relative(cwdRoot, target) : relative(cwdRoot, resolve(cwd, target)))
    }

    if (await xfs.existsPromise(ppath.join(typecheckCwd, 'tsconfig.json'))) {
      return undefined
    }

    return createProjectModel(project).workspacePatterns
  }
}
