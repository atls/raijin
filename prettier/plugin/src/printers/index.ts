import type { Node }                   from '@babel/types'
import type { Options }                from 'prettier'
import type { Printer }                from 'prettier'
import type { AST }                    from 'prettier'

import * as estree                     from 'prettier/plugins/estree'

import { alignExportFromDocPart }      from './export.js'
import { isSourceExportDeclaration }   from './export.js'
import { setExportSourceAlignOffsets } from './export.js'
import { alignImportFromDocPart }      from './import.js'
import { isSourceImportDeclaration }   from './import.js'
import { setImportAlignOffsets }       from './import.js'

const estreePrinter = (estree as unknown as { printers: Record<string, Printer> }).printers.estree

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const print: Printer<Node>['print'] = (path, options, prnt): any => {
  const node = path.getNode()
  let result = estreePrinter.print(path, options, prnt)

  if (node && Array.isArray(result)) {
    if (isSourceImportDeclaration(node)) {
      // @ts-expect-error explicit any type
      result = result.map((part) => alignImportFromDocPart(part, node))
    } else if (isSourceExportDeclaration(node)) {
      // @ts-expect-error explicit any type
      result = result.map((part) => alignExportFromDocPart(part, node))
    }
  }

  return result
}

export const preprocess = async (ast: AST, options: Options): Promise<AST> => {
  const body = ast.body as Array<Node>
  const comments = (ast as { comments?: Array<never> | null }).comments ?? []

  setImportAlignOffsets(body, options, comments)
  setExportSourceAlignOffsets(ast, options)

  return ast
}

export const printers: Record<string, Printer> = {
  'typescript-custom': {
    ...estreePrinter,
    preprocess,
    print,
  },
}
