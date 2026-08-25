import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'
import type { PortablePath }            from '@yarnpkg/fslib'

import { toNativePath }                 from '@atls/raijin/filesystem'

export const checkFiles = (
  files: ReadonlyArray<PortablePath>,
  typescript: typeof TypeScriptRuntime
): ReadonlyArray<TypeScriptRuntime.Diagnostic> => {
  const program = typescript.createProgram({
    rootNames: files.map(toNativePath),
    options: {
      noEmit: true,
    },
  })

  return typescript.getPreEmitDiagnostics(program)
}
