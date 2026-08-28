import type { createRuntimeExecArgv as createRuntimeExecArgvFn } from '@atls/raijin/runtime-exec-argv'

import { resolveRaijinRuntimeUrl } from '@atls/raijin/runtime-resolver'

export const TEST_EXEC_ARGV_ENV = 'RAIJIN_TEST_EXEC_ARGV'

const RUNTIME_EXEC_ARGV_SPECIFIER = '@atls/raijin/runtime-exec-argv'

type RuntimeExecArgvModule = {
  createRuntimeExecArgv: typeof createRuntimeExecArgvFn
}

const importRuntimeExecArgvModule = async (cwd: string): Promise<RuntimeExecArgvModule> =>
  (await import(resolveRaijinRuntimeUrl(cwd, RUNTIME_EXEC_ARGV_SPECIFIER))) as RuntimeExecArgvModule

const resolveRuntimeArgv = async (cwd: string): Promise<Array<string>> => {
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

export const createRuntimeArgv = async (cwd: string): Promise<Array<string>> => {
  const explicitArgv = parseTestExecArgv()

  return explicitArgv.length > 0 ? explicitArgv : resolveRuntimeArgv(cwd)
}
