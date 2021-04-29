import * as importSortParserTypescript  from 'import-sort-parser-typescript'
import sortImports                      from 'import-sort'
import { parsers as javascriptParsers } from 'prettier/parser-babel'
import { parsers as typescriptParsers } from 'prettier/parser-typescript'

export const organizeImports = (source) => {
  const { code } = sortImports(source, importSortParserTypescript, require.resolve('./style'))

  return code
}

export const parsers = {
  typescript: {
    ...typescriptParsers.typescript,
    preprocess(text) {
      return organizeImports(text)
    },
  },
  babel: {
    ...javascriptParsers.babel,
    preprocess(text) {
      return organizeImports(text)
    },
  },
}
