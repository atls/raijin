import tsconfig                            from '@atls/config-typescript'

import { writeFiles as writeRuntimeFiles } from '../generated/runtime-schematic-export.js'

export const writeCodeRuntimeFiles = async (_cwd: string, baseDir: string): Promise<void> => {
  await writeRuntimeFiles(baseDir)
}

export const getCodeRuntimeCompilerOptions = async (_cwd: string): Promise<object> =>
  tsconfig.compilerOptions
