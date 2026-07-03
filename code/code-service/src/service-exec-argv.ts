import type { createRuntimeExecArgv as createRuntimeExecArgvFn } from '@atls/raijin/runtime-exec-argv'
import type { createRuntimeEnvironment as createRuntimeEnvironmentFn } from '@atls/raijin/runtime-exec-argv'
import type { findPnpEsmLoader as findPnpEsmLoaderFn } from '@atls/raijin/runtime-exec-argv'
import type { resolveTypeScriptLoader as resolveTypeScriptLoaderFn } from '@atls/raijin/runtime-exec-argv'

const TYPESCRIPT_LOADER_SPECIFIER = '@atls/raijin/typescript-loader'

type RuntimeExecArgvModule = {
  createRuntimeExecArgv: typeof createRuntimeExecArgvFn
  createRuntimeEnvironment: typeof createRuntimeEnvironmentFn
  findPnpEsmLoader: typeof findPnpEsmLoaderFn
  resolveTypeScriptLoader: typeof resolveTypeScriptLoaderFn
}

const importRuntimeExecArgvModule = async (): Promise<RuntimeExecArgvModule> =>
  (await import('@atls/raijin/runtime-exec-argv')) as RuntimeExecArgvModule

export const createServiceExecArgv = (
  pnpEsmLoader?: string,
  typeScriptLoader = TYPESCRIPT_LOADER_SPECIFIER
): Array<string> => {
  const execArgv: Array<string> = []

  if (pnpEsmLoader) {
    execArgv.push('--loader', pnpEsmLoader)
  }

  execArgv.push('--loader', typeScriptLoader)
  execArgv.push('--enable-source-maps')

  return execArgv
}

export const findPnpEsmLoader = async (cwd: string): Promise<string | undefined> => {
  const { findPnpEsmLoader: resolvePnpEsmLoader } = await importRuntimeExecArgvModule()

  return resolvePnpEsmLoader(cwd)
}

export const resolveTypeScriptLoader = async (raijinPackagePath?: string): Promise<string> => {
  const { resolveTypeScriptLoader: resolveLoader } = await importRuntimeExecArgvModule()

  return resolveLoader(raijinPackagePath)
}

export const createServiceRuntimeExecArgv = async (cwd: string): Promise<Array<string>> => {
  const { createRuntimeExecArgv } = await importRuntimeExecArgvModule()

  return createRuntimeExecArgv(cwd)
}

export const createServiceRuntimeEnvironment = async (
  environment?: NodeJS.ProcessEnv
): Promise<NodeJS.ProcessEnv> => {
  const { createRuntimeEnvironment } = await importRuntimeExecArgvModule()

  return createRuntimeEnvironment(environment)
}
