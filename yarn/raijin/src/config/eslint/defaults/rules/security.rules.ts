import type { Linter } from 'eslint'

export const rules: Linter.RulesRecord = {
  'security/detect-buffer-noassert': 'warn',
  'security/detect-child-process': 'warn',
  'security/detect-disable-mustache-escape': 'warn',
  'security/detect-eval-with-expression': 'warn',
  'security/detect-new-buffer': 'warn',
  'security/detect-no-csrf-before-method-override': 'warn',
  'security/detect-non-literal-fs-filename': 'off',
  'security/detect-non-literal-regexp': 'warn',
  'security/detect-non-literal-require': 'warn',
  'security/detect-object-injection': 'off',
  'security/detect-possible-timing-attacks': 'warn',
  'security/detect-pseudoRandomBytes': 'warn',
  'security/detect-unsafe-regex': 'warn',
  'security/detect-bidi-characters': 'warn',
}
