import type { Module }             from './module.js'

import { resolveRaijinRuntimeUrl } from '@atls/raijin/runtime-resolver'

const SPECIFIER = '@atls/raijin/runtime-exec-argv'

export const resolve = async (cwd: string): Promise<Array<string>> => {
  const runtimeUrl = resolveRaijinRuntimeUrl(cwd, SPECIFIER)
  const { createRuntimeExecArgv } = (await import(runtimeUrl)) as Module

  return createRuntimeExecArgv(cwd)
}
