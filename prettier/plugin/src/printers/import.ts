import type { ImportDeclaration }   from '@babel/types'
import type { Node }                from '@babel/types'
import type { Options }             from 'prettier'

import type { LocatedComment }      from './source.js'
import type { OriginalTextOptions } from './source.js'

import { alignFromDocPart }         from './source.js'
import { getPrintWidth }            from './source.js'
import { getSourceLineLength }      from './source.js'
import { hasCommentToken }          from './source.js'
import { hasComments }              from './source.js'
import { isCommentInsideNode }      from './source.js'
import { printModuleName }          from './source.js'

type AlignableImportDeclaration = ImportDeclaration & {
  importSourceAlignBlocked?: boolean
  importSourceAlignOffset?: number
}

type CommentedNode = {
  imported?: CommentedNode | null
  innerComments?: Array<unknown> | null
  leadingComments?: Array<unknown> | null
  local?: CommentedNode | null
  trailingComments?: Array<unknown> | null
}

type AttributedImportDeclaration = ImportDeclaration & {
  attributes?: Array<unknown> | null
}

const getImportSpecifierText = (
  specifier: ImportDeclaration['specifiers'][number],
  options: Options
): string => {
  if (specifier.type === 'ImportDefaultSpecifier') {
    return specifier.local.name
  }

  if (specifier.type === 'ImportNamespaceSpecifier') {
    return `* as ${specifier.local.name}`
  }

  const imported = printModuleName(specifier.imported, options)
  const local = specifier.local.name
  const value = imported === local ? imported : `${imported} as ${local}`

  return specifier.importKind === 'type' ? `type ${value}` : value
}

const getNamedImportSpecifiersText = (
  specifiers: ImportDeclaration['specifiers'],
  options: Options
): string => {
  const specifierText = specifiers.map((specifier) => getImportSpecifierText(specifier, options))
  const joinedSpecifiers = specifierText.join(', ')

  return options.bracketSpacing === false ? `{${joinedSpecifiers}}` : `{ ${joinedSpecifiers} }`
}

const getImportSourceColumn = (node: ImportDeclaration, options: Options): number => {
  const namedSpecifiers = node.specifiers.filter(
    (specifier) => specifier.type === 'ImportSpecifier'
  )
  const defaultSpecifier = node.specifiers.find(
    (specifier) => specifier.type === 'ImportDefaultSpecifier'
  )
  const namespaceSpecifier = node.specifiers.find(
    (specifier) => specifier.type === 'ImportNamespaceSpecifier'
  )
  const importKind = node.importKind === 'type' ? 'type ' : ''

  if (namespaceSpecifier) {
    return `import ${importKind}${getImportSpecifierText(namespaceSpecifier, options)} from `.length
  }

  if (defaultSpecifier && namedSpecifiers.length > 0) {
    return `import ${importKind}${getImportSpecifierText(
      defaultSpecifier,
      options
    )}, ${getNamedImportSpecifiersText(namedSpecifiers, options)} from `.length
  }

  if (defaultSpecifier) {
    return `import ${importKind}${getImportSpecifierText(defaultSpecifier, options)} from `.length
  }

  return `import ${importKind}${getNamedImportSpecifiersText(namedSpecifiers, options)} from `
    .length
}

const hasImportSourceComments = (node: ImportDeclaration): boolean =>
  Boolean((node as AlignableImportDeclaration).importSourceAlignBlocked) ||
  hasComments(node as CommentedNode) ||
  hasComments(node.source as CommentedNode | undefined) ||
  node.specifiers.some((specifier) => {
    const commentedSpecifier = specifier as CommentedNode

    return (
      hasComments(commentedSpecifier) ||
      hasComments(commentedSpecifier.local) ||
      hasComments(commentedSpecifier.imported)
    )
  })

const hasImportAttributes = (node: ImportDeclaration): boolean => {
  const { attributes } = node as AttributedImportDeclaration

  return Boolean(attributes && attributes.length > 0)
}

export const isSourceImportDeclaration = (node: Node): node is ImportDeclaration =>
  node.type === 'ImportDeclaration' && node.specifiers.length > 0

const isAlignableImportDeclaration = (
  node: Node,
  options: Options,
  originalText: string | undefined,
  printWidth: number
): node is AlignableImportDeclaration =>
  isSourceImportDeclaration(node) &&
  Boolean(node.source) &&
  !hasImportSourceComments(node) &&
  !hasCommentToken(node, originalText) &&
  !hasImportAttributes(node) &&
  getSourceLineLength(getImportSourceColumn(node, options), node.source, options) <= printWidth

const markImportAlignBlockedComments = (
  body: Array<Node>,
  comments: Array<LocatedComment>
): void => {
  body.forEach((node) => {
    if (
      isSourceImportDeclaration(node) &&
      comments.some((comment) => isCommentInsideNode(node, comment))
    ) {
      const alignableNode = node as AlignableImportDeclaration

      alignableNode.importSourceAlignBlocked = true
    }
  })
}

export const setImportAlignOffsets = (
  body: Array<Node>,
  options: Options,
  astComments: Array<LocatedComment> = []
): void => {
  const { originalText } = options as OriginalTextOptions
  const printWidth = getPrintWidth(options)

  markImportAlignBlockedComments(body, astComments)

  const imports = body.filter((node) =>
    isAlignableImportDeclaration(node, options, originalText, printWidth))
  const maxSourceColumn =
    imports.length > 0
      ? Math.max(...imports.map((node) => getImportSourceColumn(node, options)))
      : 0

  imports.forEach((node) => {
    const sourceColumn = getImportSourceColumn(node, options)

    node.importSourceAlignOffset =
      sourceColumn < maxSourceColumn ? maxSourceColumn - sourceColumn : 0
  })
}

export const alignImportFromDocPart = (part: unknown, node: ImportDeclaration): unknown => {
  const alignOffset = (node as AlignableImportDeclaration).importSourceAlignOffset

  return alignFromDocPart(part, alignOffset)
}
