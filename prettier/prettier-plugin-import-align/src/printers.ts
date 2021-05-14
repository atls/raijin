import { typescriptAstFormat } from './constants'
import { printer }             from './extract'
import { nodeImportSize }      from './utils'

const print = (...args) => {
  const [path] = args
  const node = path.getNode()

  let result = printer.print(...args)

  if (node.type === 'ImportDeclaration') {
    result = result.map((part) => {
      if (Array.isArray(part) && part[0] === ' from' && node.alignOffset > 0) {
        const fill = Array.apply(0, Array(node.alignOffset)).fill(' ').join('')

        part[0] = `${fill} from` // eslint-disable-line no-param-reassign
      }

      return part
    })
  }

  return result
}

const preprocess = (ast, options) => {
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
  [typescriptAstFormat]: {
    ...printer,
    print,
    preprocess,
  },
}
