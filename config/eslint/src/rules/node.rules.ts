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
  'n/no-unsupported-features/es-builtins': 'off',
  'n/no-unsupported-features/es-syntax': 'off',
  'n/no-unsupported-features/node-builtins': 'off',
  'n/process-exit-as-throw': 'error',
  'n/shebang': 'error',
  'n/no-sync': 'error',
  'n/prefer-promises/dns': 'error',
  'n/prefer-promises/fs': 'error',
  'n/prefer-global/buffer': ['error', 'never'],
}
