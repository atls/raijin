import type { Linter } from 'eslint'

export const rules: Linter.RulesRecord = {
  'n/no-deprecated-api': 'error',
  'n/no-extraneous-import': 'error',
  'n/no-extraneous-require': 'error',
  'n/no-exports-assign': 'error',
  'n/no-missing-import': 'off',
  'n/no-missing-require': 'off',
  'n/no-process-exit': 'error',
  'n/no-unpublished-bin': 'error',
  'n/no-unpublished-import': 'off',
  'n/no-unpublished-require': 'off',
  'n/no-unsupported-features/es-builtins': [
    'error',
    {
      version: '>=22.16.0',
    },
  ],
  'n/no-unsupported-features/es-syntax': [
    'error',
    {
      version: '>=22.16.0',
    },
  ],
  'n/no-unsupported-features/node-builtins': [
    'error',
    {
      version: '>=22.16.0',
    },
  ],
  'n/process-exit-as-throw': 'error',
  'n/shebang': 'error',
  'n/no-sync': 'error',
  'n/prefer-promises/dns': 'error',
  'n/prefer-promises/fs': 'error',
  'n/prefer-global/buffer': ['error', 'never'],
  'n/prefer-global/process': ['error', 'always'],
  'n/prefer-global/text-decoder': ['error', 'always'],
  'n/prefer-global/text-encoder': ['error', 'always'],
  'n/prefer-global/url': ['error', 'always'],
  'n/prefer-global/url-search-params': ['error', 'always'],
  'n/prefer-node-protocol': 'error',
}
