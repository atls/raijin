import tsconfig                                    from '@atls/config-typescript'

import { writeFiles as writeGeneratedRaijinFiles } from '../generated/raijin-schematic-export.js'

export const writeRaijinFiles = async (_cwd: string, baseDir: string): Promise<void> => {
  await writeGeneratedRaijinFiles(baseDir)
}

export const getRaijinCompilerOptions = async (_cwd: string): Promise<object> =>
  tsconfig.compilerOptions
