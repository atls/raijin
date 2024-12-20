import type { Linter } from 'eslint'

export const rules: Linter.RulesRecord = {
  '@typescript-eslint/brace-style': 'off',
  '@typescript-eslint/func-call-spacing': 'off',
  '@typescript-eslint/no-array-constructor': ['error'],
  '@typescript-eslint/adjacent-overload-signatures': ['error'],
  '@typescript-eslint/consistent-indexed-object-style': ['error', 'record'],
  '@typescript-eslint/consistent-type-exports': [
    'error',
    {
      fixMixedExportsWithInlineTypeSpecifier: false,
    },
  ],
  '@typescript-eslint/method-signature-style': ['error'],
  '@typescript-eslint/consistent-type-imports': [
    'error',
    {
      prefer: 'type-imports',
      fixStyle: 'separate-type-imports',
    },
  ],
  '@typescript-eslint/no-unsafe-return': 'error',
  '@typescript-eslint/no-unsafe-argument': 'error',
  '@typescript-eslint/no-unsafe-call': 'error',
  '@typescript-eslint/member-ordering': [
    'error',
    {
      default: [
        // Index signature
        'signature',
        'call-signature',

        // Fields
        'public-static-field',
        'protected-static-field',
        'private-static-field',
        '#private-static-field',

        'public-decorated-field',
        'protected-decorated-field',
        'private-decorated-field',

        'public-instance-field',
        'protected-instance-field',
        'private-instance-field',
        '#private-instance-field',

        'public-abstract-field',
        'protected-abstract-field',

        'public-field',
        'protected-field',
        'private-field',
        '#private-field',

        'static-field',
        'instance-field',
        'abstract-field',

        'decorated-field',

        'field',

        // Static initialization
        'static-initialization',

        // Constructors
        'public-constructor',
        'protected-constructor',
        'private-constructor',

        'constructor',

        // Getters/Setters
        ['get', 'set'],

        // Methods
        'public-static-method',
        'protected-static-method',
        'private-static-method',
        '#private-static-method',

        'public-decorated-method',
        'protected-decorated-method',
        'private-decorated-method',

        'public-instance-method',
        'protected-instance-method',
        'private-instance-method',
        '#private-instance-method',

        'public-abstract-method',
        'protected-abstract-method',

        'public-method',
        'protected-method',
        'private-method',
        '#private-method',

        'static-method',
        'instance-method',
        'abstract-method',

        'decorated-method',

        'method',
      ],
    },
  ],
  '@typescript-eslint/ban-ts-comment': [
    'error',
    {
      'ts-expect-error': 'allow-with-description',
      'ts-ignore': true,
      'ts-nocheck': true,
      'ts-check': false,
      minimumDescriptionLength: 10,
    },
  ],
  '@typescript-eslint/no-explicit-any': [
    'error',
    {
      fixToUnknown: false,
      ignoreRestArgs: true,
    },
  ],
  '@typescript-eslint/no-non-null-assertion': 'error',
  '@typescript-eslint/explicit-module-boundary-types': 'error',
  '@typescript-eslint/explicit-function-return-type': 'error',
  '@typescript-eslint/default-param-last': 'error',
  '@typescript-eslint/no-base-to-string': 'error',
  '@typescript-eslint/no-confusing-void-expression': 'error',
  '@typescript-eslint/no-confusing-non-null-assertion': 'error',
  '@typescript-eslint/no-duplicate-enum-values': 'error',
  '@typescript-eslint/no-duplicate-type-constituents': 'error',
  '@typescript-eslint/no-dynamic-delete': 'error',
  '@typescript-eslint/no-empty-interface': 'error',
  '@typescript-eslint/no-extra-non-null-assertion': 'error',
  '@typescript-eslint/no-floating-promises': 'off',
  '@typescript-eslint/no-for-in-array': 'error',
  '@typescript-eslint/no-import-type-side-effects': 'error',
  '@typescript-eslint/no-invalid-void-type': 'error',
  '@typescript-eslint/no-misused-new': 'error',
  '@typescript-eslint/no-mixed-enums': 'error',
  '@typescript-eslint/no-non-null-asserted-nullish-coalescing': 'error',
  '@typescript-eslint/no-non-null-asserted-optional-chain': 'error',
  '@typescript-eslint/no-redundant-type-constituents': 'error',
  '@typescript-eslint/no-require-imports': 'error',
  '@typescript-eslint/no-unnecessary-boolean-literal-compare': 'error',
  '@typescript-eslint/no-unnecessary-qualifier': 'error',
  '@typescript-eslint/no-unnecessary-type-arguments': 'error',
  '@typescript-eslint/no-unnecessary-type-assertion': 'error',
  '@typescript-eslint/no-unnecessary-type-constraint': 'error',
  '@typescript-eslint/no-unsafe-declaration-merging': 'error',
  '@typescript-eslint/no-unsafe-enum-comparison': 'error',
  '@typescript-eslint/no-useless-empty-export': 'error',
  '@typescript-eslint/no-var-requires': 'error',
  '@typescript-eslint/non-nullable-type-assertion-style': 'error',
  '@typescript-eslint/prefer-as-const': 'error',
  '@typescript-eslint/prefer-enum-initializers': 'error',
  '@typescript-eslint/prefer-for-of': 'error',
  '@typescript-eslint/prefer-function-type': 'error',
  '@typescript-eslint/prefer-includes': 'error',
  '@typescript-eslint/prefer-literal-enum-member': 'error',
  '@typescript-eslint/prefer-optional-chain': 'error',
  '@typescript-eslint/prefer-reduce-type-parameter': 'error',
  '@typescript-eslint/prefer-string-starts-ends-with': 'error',
  '@typescript-eslint/prefer-ts-expect-error': 'error',
  '@typescript-eslint/promise-function-async': 'error',
  '@typescript-eslint/require-array-sort-compare': 'error',
  '@typescript-eslint/restrict-plus-operands': 'error',
  '@typescript-eslint/restrict-template-expressions': 'error',
  '@typescript-eslint/sort-type-constituents': 'error',
  '@typescript-eslint/unified-signatures': 'error',
  '@typescript-eslint/no-misused-promises': [
    'error',
    {
      checksConditionals: true,
      checksVoidReturn: true,
      checksSpreads: true,
    },
  ],
  '@typescript-eslint/array-type': [
    'error',
    {
      default: 'generic',
    },
  ],
  '@typescript-eslint/no-extra-parens': 'off',
  '@typescript-eslint/no-magic-numbers': [
    'off',
    {
      ignore: [],
      ignoreArrayIndexes: true,
      enforceConst: true,
      detectObjects: false,
    },
  ],
  '@typescript-eslint/no-unused-expressions': [
    'error',
    {
      allowShortCircuit: false,
      allowTernary: false,
      allowTaggedTemplates: false,
      enforceForJSX: false,
    },
  ],
  '@typescript-eslint/no-use-before-define': [
    'error',
    {
      functions: true,
      classes: true,
      variables: true,
    },
  ],
  '@typescript-eslint/quotes': 'off',
  '@typescript-eslint/naming-convention': [
    'error',
    {
      selector: 'variable',
      format: ['camelCase', 'PascalCase', 'UPPER_CASE'],
    },
    {
      selector: 'function',
      format: ['camelCase', 'PascalCase'],
    },
    {
      selector: 'typeLike',
      format: ['PascalCase'],
    },
  ],
  '@typescript-eslint/semi': 'off',
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      args: 'none',
    },
  ],
  '@typescript-eslint/no-useless-constructor': ['error'],
  '@typescript-eslint/no-empty-function': ['error'],
  '@typescript-eslint/indent': 'off',
  '@typescript-eslint/no-shadow': [
    'error',
    {
      allow: ['ClientFactory', 'ServerBuilder'],
      builtinGlobals: false,
      hoist: 'functions',
    },
  ],
  '@typescript-eslint/comma-dangle': 'off',
  '@typescript-eslint/comma-spacing': 'off',
  '@typescript-eslint/keyword-spacing': 'off',
  '@typescript-eslint/member-delimiter-style': 'off',
  '@typescript-eslint/no-extra-semi': 'off',
  '@typescript-eslint/object-curly-spacing': 'off',
  '@typescript-eslint/space-before-function-paren': 'off',
  '@typescript-eslint/space-infix-ops': 'off',
  '@typescript-eslint/type-annotation-spacing': 'off',
  '@typescript-eslint/no-deprecated': 'error',
}
