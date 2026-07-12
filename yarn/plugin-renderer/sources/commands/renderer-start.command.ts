import type { createRuntimeEnvironment as createRuntimeEnvironmentFn } from '@atls/raijin/runtime-exec-argv'

import { spawn }                                 from 'node:child_process'

import { BaseCommand }                           from '@yarnpkg/cli'

import { createChildProcessOptions }             from '@atls/raijin/commands'
import { proxyWorkspaceCommand }                 from '@atls/raijin/commands'
import { resolveWorkspaceInvocation }            from '@atls/raijin/commands'
import { shouldProxyCommand }                    from '@atls/raijin/commands'
import { waitForChildProcess }                   from '@atls/raijin/commands'
import { toNativeCwd }                           from '@atls/raijin/commands'
import { resolveRaijinRuntimeUrl }               from '@atls/raijin/runtime-resolver'

import { RENDERER_STANDALONE_SERVER_ENTRYPOINT } from './renderer-build.constants.js'

type RuntimeExecArgvModule = {
  createRuntimeEnvironment: typeof createRuntimeEnvironmentFn
}

const RUNTIME_EXEC_ARGV_SPECIFIER = '@atls/raijin/runtime-exec-argv'

export const resolveRuntimeExecArgvModuleUrl = (cwd: string): string =>
  resolveRaijinRuntimeUrl(cwd, RUNTIME_EXEC_ARGV_SPECIFIER)

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
    if (shouldProxyCommand()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    return proxyWorkspaceCommand({
      args: ['renderer', 'start'],
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const invocation = await resolveWorkspaceInvocation(this.context.cwd, this.context.plugins)
    const rendererCwd = toNativeCwd(invocation.executionCwd)

    const child = spawn(
      process.execPath,
      [`dist/${RENDERER_STANDALONE_SERVER_ENTRYPOINT}`],
      createChildProcessOptions({
        invocation,
        env: await createRendererRuntimeEnvironment(rendererCwd, process.env),
        stdio: [this.context.stdin, this.context.stdout, this.context.stderr],
      })
    )

    return waitForChildProcess(child)
  }
}
