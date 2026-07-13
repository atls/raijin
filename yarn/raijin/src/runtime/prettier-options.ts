import type { Config } from 'prettier'

export const prettierOptions: Config = {
  semi: false,
  singleQuote: true,
  tabWidth: 2,
  jsxSingleQuote: true,
  printWidth: 100,
  trailingComma: 'es5',
}

export default prettierOptions
