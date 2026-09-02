import type { createRuntimeExecArgv as CreateRuntimeExecArgv } from '@atls/raijin/runtime-exec-argv'

export type Module = {
  createRuntimeExecArgv: typeof CreateRuntimeExecArgv
}
