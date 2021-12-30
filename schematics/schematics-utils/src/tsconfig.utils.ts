import { updateJsonInTree } from './json.utils'

export const updateTsConfigInTree = (compilerOptions: object) =>
  updateJsonInTree('tsconfig.json', (tsconfig) => ({
    ...tsconfig,
    compilerOptions,
  }))
