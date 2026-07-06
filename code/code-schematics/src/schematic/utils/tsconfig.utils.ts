/* eslint-disable */

import { updateJsonInTree } from './json.utils.js'

interface TsConfig {
  compilerOptions?: object
}

export const mergeTsCompilerOptions = (
  existingCompilerOptions: object | undefined,
  compilerOptions: object
): object => ({
  ...compilerOptions,
  ...existingCompilerOptions,
})

export const updateTsConfigInTree = (compilerOptions: object) =>
  updateJsonInTree('tsconfig.json', (tsconfig) => ({
    ...tsconfig,
    compilerOptions: mergeTsCompilerOptions(
      (tsconfig as TsConfig).compilerOptions,
      compilerOptions
    ),
  }))
