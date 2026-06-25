import type { ImportDeclaration } from '@babel/types'
import type { Node }              from '@babel/types'

const fromDocPart = ' from'
const sourceColumnOffset = 6
const namedSpecifiersSourceColumnOffset = 8

type AlignableImportDeclaration = ImportDeclaration & {
  importSourceAlignOffset?: number
}

const isSingleLineSourceImportDeclaration = (node: Node): node is ImportDeclaration =>
  node.type === 'ImportDeclaration' &&
  node.specifiers.length > 0 &&
  Boolean(node.loc) &&
  node.loc!.start.line === node.loc!.end.line

const getImportSourceColumn = (node: ImportDeclaration): number => {
  const specifier = node.specifiers[node.specifiers.length - 1]

  if (!specifier.loc) {
    return 0
  }

  const offset = 'imported' in specifier ? namedSpecifiersSourceColumnOffset : sourceColumnOffset

  return specifier.loc.end.column + offset
}

export const isSourceImportDeclaration = (node: Node): node is ImportDeclaration =>
  node.type === 'ImportDeclaration' && node.specifiers.length > 0

export const setImportAlignOffsets = (body: Array<Node>): void => {
  const imports = body.filter(isSingleLineSourceImportDeclaration)
  const maxSourceColumn =
    imports.length > 0 ? Math.max(...imports.map((node) => getImportSourceColumn(node))) : 0

  imports.forEach((node) => {
    const alignableNode = node as AlignableImportDeclaration
    const sourceColumn = getImportSourceColumn(node)

    alignableNode.importSourceAlignOffset =
      sourceColumn < maxSourceColumn ? maxSourceColumn - sourceColumn : 0
  })
}

export const alignImportFromDocPart = (part: unknown, node: ImportDeclaration): unknown => {
  const alignOffset = (node as AlignableImportDeclaration).importSourceAlignOffset

  if (Array.isArray(part) && part[0] === fromDocPart && alignOffset && alignOffset > 0) {
    part[0] = `${''.padStart(alignOffset, ' ')}${fromDocPart}`
  }

  return part
}
