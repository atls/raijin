import type { createRuntimeExecArgv as createRuntimeExecArgvFn }     from '@atls/code-runtime/runtime-exec-argv'
import type { findPnpEsmLoader as findPnpEsmLoaderFn }               from '@atls/code-runtime/runtime-exec-argv'
import type { resolveTypeScriptLoader as resolveTypeScriptLoaderFn } from '@atls/code-runtime/runtime-exec-argv'

const TYPESCRIPT_LOADER_SPECIFIER = '@atls/code-runtime/typescript-loader'
const RUNTIME_EXEC_ARGV_MODULE = '@atls/code-runtime/runtime-exec-argv'

type RuntimeExecArgvModule = {
  createRuntimeExecArgv: typeof createRuntimeExecArgvFn
  findPnpEsmLoader: typeof findPnpEsmLoaderFn
  resolveTypeScriptLoader: typeof resolveTypeScriptLoaderFn
}

const importRuntimeExecArgvModule = async (): Promise<RuntimeExecArgvModule> =>
  (await import(RUNTIME_EXEC_ARGV_MODULE)) as RuntimeExecArgvModule

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

export const resolveTypeScriptLoader = async (codeRuntimePackagePath?: string): Promise<string> => {
  const { resolveTypeScriptLoader: resolveLoader } = await importRuntimeExecArgvModule()

  return resolveLoader(codeRuntimePackagePath)
}

export const createServiceRuntimeExecArgv = async (cwd: string): Promise<Array<string>> => {
  const { createRuntimeExecArgv } = await importRuntimeExecArgvModule()

  return createRuntimeExecArgv(cwd)
}
