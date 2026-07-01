import { eslintconfig } from '@atls/raijin/eslint'

export default [
  ...eslintconfig,
  {
    ignores: ['eslint.config.mjs', 'yarn.js', 'yarn-remote.cjs'],
  },
]
