import { eslintconfig } from '@atls/raijin/eslint'

export default [
  ...eslintconfig,
  {
    files: ['.github/actions/release/release.config.js'],
    rules: {
      'no-template-curly-in-string': 'off',
    },
  },
]
