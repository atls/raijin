import type { Node }                      from '@babel/types'
import type { Options }                   from 'prettier'
import type { Printer }                   from 'prettier'
import type { AST }                       from 'prettier'

import * as estree                        from 'prettier/plugins/estree'

import { isSourceExportDeclaration }      from './export.js'
import { markExportAlignBlockedComments } from './export.js'
import { registerExportSourceDoc }        from './export.js'
import { setExportSourceAlignOffsets }    from './export.js'
import { isSourceImportDeclaration }      from './import.js'
import { markImportAlignBlockedComments } from './import.js'
import { registerImportSourceDoc }        from './import.js'
import { setImportAlignOffsets }          from './import.js'

const estreePrinter = (estree as unknown as { printers: Record<string, Printer> }).printers.estree

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const print: Printer<Node>['print'] = (path, options, prnt): any => {
  const node = path.getNode()
  const result = estreePrinter.print(path, options, prnt)

  if (node) {
    if (isSourceImportDeclaration(node)) {
      registerImportSourceDoc(node, result)
    } else if (isSourceExportDeclaration(node)) {
      registerExportSourceDoc(node, result)
    } else if (node.type === 'Program') {
      const body = node.body as Array<Node>

      setImportAlignOffsets(body, options)
      setExportSourceAlignOffsets(node, options)
    }
  }

  return result
}

export const preprocess = async (ast: AST, options: Options): Promise<AST> => {
  const body = ast.body as Array<Node>
  const comments = (ast as { comments?: Array<never> | null }).comments ?? []

  markImportAlignBlockedComments(body, comments)
  markExportAlignBlockedComments(body, comments)

  return ast
}

export const printers: Record<string, Printer> = {
  'typescript-custom': {
    ...estreePrinter,
    preprocess,
    print,
  },
}
