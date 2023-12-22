import * as babel        from 'prettier/plugins/babel'
import * as estree       from 'prettier/plugins/estree'
import * as typescript   from 'prettier/plugins/typescript'

import { AstPath }       from 'prettier'
import { Doc }           from 'prettier'
import { ParserOptions } from 'prettier'
import { format } from 'prettier/standalone'

;(async () => {
  try {
    await format('const n = 5;', {
      plugins: [babel, typescript],
      parser(text: string, { typescript: ts }, options: ParserOptions) {
        return ts(text)
      },
    })
    // eslint-disable-next-line no-empty
  } catch (e) {}
})()

const nodeImportSize = (node) => {
  if (node.specifiers.length === 0) {
    return 0
  }

  const specifier = node.specifiers[node.specifiers.length - 1]

  const offset = specifier.imported ? 8 : 6

  return specifier.loc.end.column + offset
}

type Print = (path: AstPath, options: ParserOptions, prnt: (path: AstPath) => Doc) => Doc

const print: Print = (path, options, prnt) => {
  const node = path.getNode()

  // @ts-ignore
  let result = estree.printers.estree.print(path, options, prnt)

  if (node.type === 'ImportDeclaration' && Array.isArray(result)) {
    result = result?.map((part) => {
      if (Array.isArray(part) && part[0] === ' from' && node.alignOffset > 0) {
        const fill = Array.apply(0, Array(node.alignOffset)).fill(' ').join('')

        part[0] = `${fill} from` // eslint-disable-line no-param-reassign
      }

      return part
    })
  }

  return result
}

const preprocess = (ast, options: ParserOptions): Promise<any> | any => {
  const imports = ast.body.filter(
    (node) =>
      node.type === 'ImportDeclaration' && node.loc && node.loc.end.line === node.loc.start.line
  )

  const maxAlignLength =
    imports.length > 0 ? Math.max(...imports.map((node) => nodeImportSize(node))) : 0

  ast.body.forEach((node, index) => {
    if (
      node.type === 'ImportDeclaration' &&
      node.loc &&
      node.loc.end.line === node.loc.start.line
    ) {
      node.alignOffset = 0 // eslint-disable-line

      const nodeLength = nodeImportSize(node)

      // eslint-disable-next-line
      node.alignOffset = nodeLength < maxAlignLength ? maxAlignLength - nodeLength : 0
    }
  })

  return ast
}

export const printers = {
  'typescript-custom': {
    // @ts-ignore
    ...estree.printers.estree,
    preprocess,
    print,
  },
}
