import type { createRuntimeExecArgv as CreateRuntimeExecArgv } from '@atls/raijin/runtime-exec-argv'

import { resolveRaijinRuntimeUrl }                             from '@atls/raijin/runtime-resolver'

const RUNTIME_EXEC_ARGV_SPECIFIER = '@atls/raijin/runtime-exec-argv'

type RuntimeExecArgvModule = {
  createRuntimeExecArgv: typeof CreateRuntimeExecArgv
}

export const resolveRuntimeExecArgv = async (cwd: string): Promise<Array<string>> => {
  const runtimeUrl = resolveRaijinRuntimeUrl(cwd, RUNTIME_EXEC_ARGV_SPECIFIER)
  const { createRuntimeExecArgv } = (await import(runtimeUrl)) as RuntimeExecArgvModule

  return createRuntimeExecArgv(cwd)
}
