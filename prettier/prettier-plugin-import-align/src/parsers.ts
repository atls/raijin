import { parsers as typescriptParsers } from 'prettier/parser-typescript'

import { typescriptAstFormat }          from './constants'

export const parsers = {
  typescript: {
    ...typescriptParsers.typescript,
    astFormat: typescriptAstFormat,
    preprocess: (source) =>
      source
        .split('\n')
        .map((line) => {
          if (line.includes('import ') && line.includes(' from ')) {
            return line.replace(/\s{2,}/g, ' ')
          }

          return line
        })
        .join('\n'),
  },
}
