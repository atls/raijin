import { updateJsonInTree } from './json.utils.js'

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const updateTsConfigInTree = (compilerOptions: object) =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  updateJsonInTree('tsconfig.json', (tsconfig) => ({
    ...tsconfig,
    compilerOptions,
  }))
