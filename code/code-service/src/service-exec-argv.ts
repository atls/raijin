import type { createRuntimeExecArgv as createRuntimeExecArgvFn } from '@atls/raijin/runtime-exec-argv'
import type { createRuntimeEnvironment as createRuntimeEnvironmentFn } from '@atls/raijin/runtime-exec-argv'
import type { findPnpEsmLoader as findPnpEsmLoaderFn } from '@atls/raijin/runtime-exec-argv'
import type { resolveTypeScriptLoader as resolveTypeScriptLoaderFn } from '@atls/raijin/runtime-exec-argv'

import { resolveRaijinRuntimeUrl }                     from '@atls/raijin/runtime-resolver'

const RUNTIME_EXEC_ARGV_SPECIFIER = '@atls/raijin/runtime-exec-argv'
const TYPESCRIPT_LOADER_SPECIFIER = '@atls/raijin/typescript-loader'

type RuntimeExecArgvModule = {
  createRuntimeExecArgv: typeof createRuntimeExecArgvFn
  createRuntimeEnvironment: typeof createRuntimeEnvironmentFn
  findPnpEsmLoader: typeof findPnpEsmLoaderFn
  resolveTypeScriptLoader: typeof resolveTypeScriptLoaderFn
}

export const resolveRuntimeExecArgvModuleUrl = (cwd: string): string =>
  resolveRaijinRuntimeUrl(cwd, RUNTIME_EXEC_ARGV_SPECIFIER)

const importRuntimeExecArgvModule = async (cwd: string): Promise<RuntimeExecArgvModule> =>
  (await import(resolveRuntimeExecArgvModuleUrl(cwd))) as RuntimeExecArgvModule

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
  const { findPnpEsmLoader: resolvePnpEsmLoader } = await importRuntimeExecArgvModule(cwd)

  return resolvePnpEsmLoader(cwd)
}

export const resolveTypeScriptLoader = async (
  cwd: string,
  raijinPackagePath?: string
): Promise<string> => {
  const { resolveTypeScriptLoader: resolveLoader } = await importRuntimeExecArgvModule(cwd)

  return resolveLoader(raijinPackagePath)
}

export const createServiceRuntimeExecArgv = async (cwd: string): Promise<Array<string>> => {
  const { createRuntimeExecArgv } = await importRuntimeExecArgvModule(cwd)

  return createRuntimeExecArgv(cwd)
}

export const createServiceRuntimeEnvironment = async (
  cwd: string,
  environment?: NodeJS.ProcessEnv
): Promise<NodeJS.ProcessEnv> => {
  const { createRuntimeEnvironment } = await importRuntimeExecArgvModule(cwd)

  return createRuntimeEnvironment(environment)
}
