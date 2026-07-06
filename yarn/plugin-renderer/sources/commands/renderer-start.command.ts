import type { createRuntimeEnvironment as createRuntimeEnvironmentFn } from '@atls/raijin/runtime-exec-argv'

import { spawn }                                 from 'node:child_process'
import { createRequire }                         from 'node:module'
import { join }                                  from 'node:path'
import { pathToFileURL }                         from 'node:url'

import { BaseCommand }                           from '@yarnpkg/cli'
import { Filename }                              from '@yarnpkg/fslib'
import { execUtils }                             from '@yarnpkg/core'
import { xfs }                                   from '@yarnpkg/fslib'

import { COMMAND_PROXY_EXECUTION }               from '@atls/yarn-plugin-tools/command-context'
import { createCommandProxyEnvironment }         from '@atls/yarn-plugin-tools/command-context'
import { resolveWorkspaceCommandContext }        from '@atls/yarn-plugin-tools/command-context'
import { makeCurrentYarnExecutable } from '@atls/yarn-plugin-tools/current-yarn-executable'

import { RENDERER_STANDALONE_SERVER_ENTRYPOINT } from './renderer-build.constants.js'

type RuntimeExecArgvModule = {
  createRuntimeEnvironment: typeof createRuntimeEnvironmentFn
}

const RUNTIME_EXEC_ARGV_SPECIFIER = '@atls/raijin/runtime-exec-argv'

export const resolveRuntimeExecArgvModuleUrl = (cwd: string): string => {
  const workspaceRequire = createRequire(join(cwd, 'package.json'))

  return pathToFileURL(workspaceRequire.resolve(RUNTIME_EXEC_ARGV_SPECIFIER)).href
}

const importRuntimeExecArgvModule = async (cwd: string): Promise<RuntimeExecArgvModule> =>
  (await import(resolveRuntimeExecArgvModuleUrl(cwd))) as RuntimeExecArgvModule

const createRendererRuntimeEnvironment = async (
  cwd: string,
  environment?: NodeJS.ProcessEnv
): Promise<NodeJS.ProcessEnv> => {
  const { createRuntimeEnvironment } = await importRuntimeExecArgvModule(cwd)

  return createRuntimeEnvironment(environment, { preservePnpEsmLoader: true })
}

export class RendererStartCommand extends BaseCommand {
  static override paths = [['renderer', 'start']]

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

    const { code } = await execUtils.pipevp(executable, ['renderer', 'start'], {
      cwd: workspaceCwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env,
    })

    return code
  }

  async executeRegular(): Promise<number> {
    const { workspaceCwd } = await resolveWorkspaceCommandContext(
      this.context.cwd,
      this.context.plugins
    )

    const child = spawn(process.execPath, [`dist/${RENDERER_STANDALONE_SERVER_ENTRYPOINT}`], {
      cwd: workspaceCwd,
      env: await createRendererRuntimeEnvironment(workspaceCwd, process.env),
      stdio: [this.context.stdin, this.context.stdout, this.context.stderr],
    })

    return new Promise<number>((resolve, reject) => {
      child.once('error', reject)
      child.once('exit', (code) => {
        resolve(code ?? 1)
      })
    })
  }
}
