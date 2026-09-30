import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

export type TypeScriptProvider = {
  readonly ts: typeof TypeScriptRuntime
}
