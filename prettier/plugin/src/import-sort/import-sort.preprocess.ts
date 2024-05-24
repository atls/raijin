/* eslint-disable @typescript-eslint/no-unnecessary-type-arguments */

import type { Parser }                from 'prettier'
import type { Plugin }                from 'prettier'

import { sortImports }                from 'import-sort'

import { ImportSortTypeScriptParser } from './import-sort-typescript.parser.js'
import { style }                      from './import-sort.style.js'

const findTypeScriptParser = (plugins: Array<Plugin<any>>): Parser<any> => {
  const plugin = plugins.find((p) => {
    if (typeof p === 'string') {
      return false
    }

    if (!p.parsers) {
      return false
    }

    return p.parsers.typescript
  })

  return plugin!.parsers!.typescript
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const preprocess = (source: string, { plugins }: any): string => {
  const typescript = findTypeScriptParser(plugins as Array<Plugin<any>>)

  // @ts-expect-error
  const parser = new ImportSortTypeScriptParser(typescript.parse(source))

  const { code } = sortImports(source, parser, style)

  return code
}
