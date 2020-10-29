import prettierConfig from '@monstrs/prettier-config'

export const config = {
  extends: ['airbnb-typescript', 'prettier/react', 'plugin:prettier/recommended'],
  env: {
    node: true,
    browser: true,
    jest: true,
  },
  rules: {
    'prettier/prettier': ['error', prettierConfig],
    'class-methods-use-this': 0,
    'import/no-cycle': 0,
    'import/no-duplicates': 0,
    'import/prefer-default-export': 0,
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'jsx-a11y/html-has-lang': 0,
    'react/jsx-props-no-spreading': 0,
    'react/jsx-filename-extension': [1, { extensions: ['.js', '.jsx', '.tsx'] }],
    'react/prop-types': 0,
    'react/no-danger': 0,
    '@typescript-eslint/semi': 0,
    '@typescript-eslint/no-unused-vars': ['error', { args: 'none' }],
    'no-useless-constructor': 'off',
    '@typescript-eslint/no-useless-constructor': 'error',
    'no-empty-function': 'off',
    '@typescript-eslint/no-empty-function': 'error',
    '@typescript-eslint/indent': 0,
  },
}
