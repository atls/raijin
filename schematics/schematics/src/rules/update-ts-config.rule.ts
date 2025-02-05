import tsconfig                 from '@atls/config-typescript'

import { updateTsConfigInTree } from '../utils/index.js'

export const updateTsConfigRule = updateTsConfigInTree({
  ...tsconfig.default.compilerOptions,
})
