import type { TypeScriptCompilerOptionsShape } from '../config.interfaces.js'
import type { TypeScriptConfigShape }          from '../config.interfaces.js'

export const mergeTypeScriptCompilerOptions = <
  Defaults extends Record<string, unknown>,
  Existing extends Record<string, unknown>,
>(
  defaults: Defaults,
  existing: Existing | undefined
): Defaults & Existing =>
  ({
    ...defaults,
    ...existing,
  }) as Defaults & Existing

export const applyTypeScriptCompilerOptions = (
  config: TypeScriptConfigShape,
  compilerOptions: TypeScriptCompilerOptionsShape
): TypeScriptConfigShape => ({
  ...config,
  compilerOptions: mergeTypeScriptCompilerOptions(compilerOptions, config.compilerOptions),
})
