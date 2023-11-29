require('@rushstack/eslint-patch/modern-module-resolution')

module.exports = {
  extends: ['./config/eslint/src/working-example/index.js'],
  parserOptions: {
    project: './tsconfig.json',
  },
  ignorePatterns: ['.eslintrc.js'],
}
