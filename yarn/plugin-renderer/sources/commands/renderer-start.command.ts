import type { WorkspaceInvocation }              from '@atls/raijin/commands'
import type { createRuntimeEnvironment as createRuntimeEnvironmentFn } from '@atls/raijin/runtime-exec-argv'

import { RaijinCommand }                         from '@atls/raijin/commands'
import { toNativeCwd }                           from '@atls/raijin/commands'
import { resolveRaijinRuntimeUrl }               from '@atls/raijin/runtime-resolver'

import { RENDERER_STANDALONE_SERVER_ENTRYPOINT } from '../artifact/entrypoint.js'

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

export class RendererStartCommand extends RaijinCommand {
  static override paths = [['renderer', 'start']]

  static override usage = RaijinCommand.Usage({
    description: 'start a built renderer artifact',
  })

  async executeWorkspace(invocation: WorkspaceInvocation): Promise<number> {
    const rendererCwd = toNativeCwd(invocation.executionCwd)

    const result = await invocation.child.execute(
      process.execPath,
      [`dist/${RENDERER_STANDALONE_SERVER_ENTRYPOINT}`],
      {
        nodeOptions: async (nodeOptions) =>
          (await createRendererRuntimeEnvironment(rendererCwd, { NODE_OPTIONS: nodeOptions }))
            .NODE_OPTIONS,
      }
    )

    return result.exitCode
  }
}
