import type { CommandInput }            from '@atls/raijin/commands'
import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

import { toNativePath }                 from '@atls/raijin/filesystem'

export const checkFiles = (
  input: CommandInput,
  typecheckSkipLibCheck: boolean | undefined,
  typescript: typeof TypeScriptRuntime
): ReadonlyArray<TypeScriptRuntime.Diagnostic> => {
  const program = typescript.createProgram({
    rootNames: input.targets.map(({ path }) => toNativePath(path)),
    options: {
      ...(typecheckSkipLibCheck === undefined ? {} : { skipLibCheck: typecheckSkipLibCheck }),
      noEmit: true,
    },
  })

  return typescript.getPreEmitDiagnostics(program)
}
