import type { WorkspaceInvocation }              from '@atls/raijin/commands'
import type { createRuntimeEnvironment as createRuntimeEnvironmentFn } from '@atls/raijin/runtime-exec-argv'

import { BaseCommand }                           from '@yarnpkg/cli'

import { defineCommandInvocation }               from '@atls/raijin/commands'
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

export class RendererStartCommand extends BaseCommand {
  static override paths = [['renderer', 'start']]

  static raijinCommand = defineCommandInvocation({ scope: 'workspace' })

  static override usage = BaseCommand.Usage({
    description: 'start a built renderer artifact',
  })

  override async execute(invocation?: WorkspaceInvocation): Promise<number> {
    if (!invocation) {
      throw new Error('Command invocation context is missing')
    }

    const rendererCwd = toNativeCwd(invocation.executionCwd)

    const result = await invocation.child.execute(
      process.execPath,
      [`dist/${RENDERER_STANDALONE_SERVER_ENTRYPOINT}`],
      {
        environment: async (environment) =>
          createRendererRuntimeEnvironment(rendererCwd, environment),
      }
    )

    return result.exitCode
  }
}
