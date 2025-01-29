/* eslint-disable @typescript-eslint/no-unnecessary-type-arguments */

import type { Parser }                from 'prettier'
import type { Plugin }                from 'prettier'

import { sortImports }                from 'import-sort'

import { ImportSortTypeScriptParser } from './import-sort-typescript.parser.js'
import { style }                      from './import-sort.style.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const findTypeScriptParser = (plugins: Array<Plugin<any>>): Parser<any> | null => {
  const plugin = plugins.find((p) => {
    if (typeof p === 'string') {
      return false
    }

    if (!p.parsers) {
      return false
    }

    return p.parsers.typescript
  })

  return plugin?.parsers?.typescript || null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/explicit-module-boundary-types
export const preprocess = (source: string, { plugins }: any): string => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typescript = findTypeScriptParser(plugins as Array<Plugin<any>>)

  // @ts-expect-error expected 2 arguments, but got 1
  const parser = new ImportSortTypeScriptParser(typescript.parse(source))

  const { code } = sortImports(source, parser, style)

  return code
}
