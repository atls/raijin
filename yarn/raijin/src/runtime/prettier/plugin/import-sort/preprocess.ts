import type { Parser }                from 'prettier'

import * as typescript                from 'prettier/plugins/typescript'
import { sortImports }                from 'import-sort'

import { ImportSortTypeScriptParser } from './typescript.parser.js'
import { createStyle }                from './style.js'

export const preprocess = (
  source: string,
  { plugins }: Parameters<NonNullable<Parser['preprocess']>>[1],
  workspacePackageNames: ReadonlyArray<string> = []
): string => {
  // @ts-expect-error parser options type is wider at runtime than @types/prettier declares
  const program = typescript.parsers.typescript.parse(source, { plugins })

  const parser = new ImportSortTypeScriptParser(program)

  const { code } = sortImports(source, parser, createStyle(workspacePackageNames))

  return code
}
