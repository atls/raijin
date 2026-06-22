import type { createRuntimeExecArgv as createRuntimeExecArgvFn } from '@atls/code-runtime/runtime-exec-argv'

import { importCodeRuntimeModule }                               from '@atls/raijin/runtime'

export const TEST_EXEC_ARGV_ENV = 'RAIJIN_TEST_EXEC_ARGV'

const TYPESCRIPT_LOADER_SPECIFIER = '@atls/code-runtime/typescript-loader'
const RUNTIME_EXEC_ARGV_MODULE = '@atls/code-runtime/runtime-exec-argv'

type RuntimeExecArgvModule = {
  createRuntimeExecArgv: typeof createRuntimeExecArgvFn
}

const importRuntimeExecArgvModule = async (): Promise<RuntimeExecArgvModule> =>
  importCodeRuntimeModule<RuntimeExecArgvModule>(RUNTIME_EXEC_ARGV_MODULE)

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
  const { createRuntimeExecArgv } = await importRuntimeExecArgvModule()

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
