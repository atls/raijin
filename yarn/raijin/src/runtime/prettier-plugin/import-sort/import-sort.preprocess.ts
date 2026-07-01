import * as typescript                from 'prettier/plugins/typescript'
import { sortImports }                from 'import-sort'

import { ImportSortTypeScriptParser } from './import-sort-typescript.parser.js'
import { style }                      from './import-sort.style.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const preprocess = (source: string, { plugins }: any): string => {
  // @ts-expect-error parser options type is wider at runtime than @types/prettier declares
  const program = typescript.parsers.typescript.parse(source, { plugins })

  const parser = new ImportSortTypeScriptParser(program)

  const { code } = sortImports(source, parser, style)

  return code
}
