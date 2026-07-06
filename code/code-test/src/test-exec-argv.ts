import type { createRuntimeExecArgv as createRuntimeExecArgvFn } from '@atls/raijin/runtime-exec-argv'

import { resolveRaijinRuntimeUrl } from '@atls/raijin/runtime-resolver'

export const TEST_EXEC_ARGV_ENV = 'RAIJIN_TEST_EXEC_ARGV'

const RUNTIME_EXEC_ARGV_SPECIFIER = '@atls/raijin/runtime-exec-argv'
const TYPESCRIPT_LOADER_SPECIFIER = '@atls/raijin/typescript-loader'

type RuntimeExecArgvModule = {
  createRuntimeExecArgv: typeof createRuntimeExecArgvFn
}

export const resolveRuntimeExecArgvModuleUrl = (cwd: string): string =>
  resolveRaijinRuntimeUrl(cwd, RUNTIME_EXEC_ARGV_SPECIFIER)

const importRuntimeExecArgvModule = async (cwd: string): Promise<RuntimeExecArgvModule> =>
  (await import(resolveRuntimeExecArgvModuleUrl(cwd))) as RuntimeExecArgvModule

export const createTestExecArgv = (
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

export const createTestRuntimeExecArgv = async (cwd: string): Promise<Array<string>> => {
  const { createRuntimeExecArgv } = await importRuntimeExecArgvModule(cwd)

  return createRuntimeExecArgv(cwd)
}

export const parseTestExecArgv = (value = process.env[TEST_EXEC_ARGV_ENV]): Array<string> => {
  if (!value) {
    return []
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed
    }
  } catch {
    return []
  }

  return []
}
