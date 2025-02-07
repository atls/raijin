import tsconfig                 from '@atls/config-typescript'

import { updateTsConfigInTree } from '../utils/index.js'

// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
export const updateTsConfigRule = updateTsConfigInTree({
  // @ts-expect-error propery does not exist
  ...tsconfig.default.compilerOptions,
})
