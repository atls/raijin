import type { CommandInput }            from '@atls/raijin/commands'
import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

import { toNativePath }                 from '@atls/raijin/filesystem'

export const checkFiles = (
  input: CommandInput,
  typescript: typeof TypeScriptRuntime
): ReadonlyArray<TypeScriptRuntime.Diagnostic> => {
  const program = typescript.createProgram({
    rootNames: input.targets.map(({ path }) => toNativePath(path)),
    options: {
      noEmit: true,
    },
  })

  return typescript.getPreEmitDiagnostics(program)
}
