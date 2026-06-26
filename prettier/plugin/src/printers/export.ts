import type { ExportAllDeclaration }   from '@babel/types'
import type { ExportNamedDeclaration } from '@babel/types'
import type { Node }                   from '@babel/types'
import type { Options }                from 'prettier'
import type { AST }                    from 'prettier'

import type { LocatedComment }         from './source.js'
import type { OriginalTextOptions }    from './source.js'

import { alignFromDocPart }            from './source.js'
import { getOriginalNodeText }         from './source.js'
import { getPrintWidth }               from './source.js'
import { getRangeEnd }                 from './source.js'
import { getRangeStart }               from './source.js'
import { getSourceLineLength }         from './source.js'
import { hasCommentToken }             from './source.js'
import { hasComments }                 from './source.js'
import { isCommentInsideNode }         from './source.js'
import { printModuleName }             from './source.js'

const unsupportedImportAssertionPattern = /^\s*assert\s*\{/u

type SourceExportDeclaration = ExportAllDeclaration | ExportNamedDeclaration

type AlignableExportDeclaration = SourceExportDeclaration & {
  exportSourceAlignBlocked?: boolean
  exportSourceAlignOffset?: number
}

type RangedNode = {
  end?: number | null
  range?: [number, number] | null
}

type CommentedNode = {
  exported?: CommentedNode | null
  innerComments?: Array<unknown> | null
  leadingComments?: Array<unknown> | null
  local?: CommentedNode | null
  trailingComments?: Array<unknown> | null
}

type AttributedExportDeclaration = SourceExportDeclaration & {
  attributes?: Array<unknown> | null
}

export const isSourceExportDeclaration = (node: Node): node is SourceExportDeclaration =>
  (node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') &&
  Boolean(node.source)

const hasExportSourceComments = (node: SourceExportDeclaration): boolean =>
  Boolean((node as AlignableExportDeclaration).exportSourceAlignBlocked) ||
  hasComments(node as CommentedNode) ||
  hasComments(node.source as CommentedNode | undefined) ||
  ('specifiers' in node &&
    node.specifiers.some((specifier) => {
      const commentedSpecifier = specifier as CommentedNode

      return (
        hasComments(commentedSpecifier) ||
        hasComments(commentedSpecifier.local) ||
        hasComments(commentedSpecifier.exported)
      )
    }))

const markExportAlignBlockedComments = (
  body: Array<Node>,
  comments: Array<LocatedComment>
): void => {
  body.forEach((node) => {
    if (
      isSourceExportDeclaration(node) &&
      comments.some((comment) => isCommentInsideNode(node, comment))
    ) {
      const alignableNode = node as AlignableExportDeclaration

      alignableNode.exportSourceAlignBlocked = true
    }
  })
}

const isLocatedSourceExportDeclaration = (node: Node): node is SourceExportDeclaration =>
  isSourceExportDeclaration(node) && Boolean(node.loc) && Boolean(node.source?.loc)

const getExportAllSourceColumn = (node: ExportAllDeclaration, options: Options): number => {
  const { exported } = node as ExportAllDeclaration & {
    exported?: Node | null
  }
  const exportKind = node.exportKind === 'type' ? 'type ' : ''

  if (exported) {
    return `export ${exportKind}* as ${printModuleName(exported, options)} from `.length
  }

  return `export ${exportKind}* from `.length
}

const hasExplicitExportAlias = (
  specifier: ExportNamedDeclaration['specifiers'][number],
  originalText: string | undefined
): boolean => {
  if (specifier.type !== 'ExportSpecifier') {
    return false
  }

  const localEnd = getRangeEnd(specifier.local as RangedNode)
  const exportedStart = getRangeStart(specifier.exported as RangedNode)

  if (!originalText || localEnd === undefined || exportedStart === undefined) {
    return false
  }

  return exportedStart > localEnd && /\bas\b/u.test(originalText.slice(localEnd, exportedStart))
}

const getExportSpecifierText = (
  specifier: ExportNamedDeclaration['specifiers'][number],
  options: Options,
  originalText: string | undefined
): string => {
  if (specifier.type !== 'ExportSpecifier') {
    return getOriginalNodeText(specifier as RangedNode, originalText)?.trim() ?? ''
  }

  const local = printModuleName(specifier.local, options)
  const exported = printModuleName(specifier.exported, options)
  const value =
    local === exported && !hasExplicitExportAlias(specifier, originalText)
      ? local
      : `${local} as ${exported}`

  return specifier.exportKind === 'type' ? `type ${value}` : value
}

const getNamedExportSpecifiersText = (
  node: ExportNamedDeclaration,
  options: Options,
  originalText: string | undefined
): string => {
  const specifierText = node.specifiers.map((specifier) =>
    getExportSpecifierText(specifier, options, originalText))
  const joinedSpecifiers = specifierText.join(', ')

  return options.bracketSpacing === false ? `{${joinedSpecifiers}}` : `{ ${joinedSpecifiers} }`
}

const getExportNamedSourceColumn = (
  node: ExportNamedDeclaration,
  options: Options,
  originalText: string | undefined
): number => {
  const exportKind = node.exportKind === 'type' ? 'type ' : ''
  if (node.specifiers.length === 0) {
    return `export ${exportKind}{} from `.length
  }

  return `export ${exportKind}${getNamedExportSpecifiersText(node, options, originalText)} from `
    .length
}

const getExportSourceColumn = (
  node: SourceExportDeclaration,
  options: Options,
  originalText: string | undefined
): number =>
  node.type === 'ExportAllDeclaration'
    ? getExportAllSourceColumn(node, options)
    : getExportNamedSourceColumn(node, options, originalText)

const hasUnsupportedImportAssertion = (
  node: SourceExportDeclaration,
  originalText: string | undefined
): boolean => {
  const sourceEnd = getRangeEnd(node.source as RangedNode | null | undefined)
  const nodeEnd = getRangeEnd(node as RangedNode)

  if (!originalText || sourceEnd === undefined || nodeEnd === undefined) {
    return false
  }

  return unsupportedImportAssertionPattern.test(originalText.slice(sourceEnd, nodeEnd))
}

const hasImportAttributes = (node: SourceExportDeclaration): boolean => {
  const { attributes } = node as AttributedExportDeclaration

  return Boolean(attributes && attributes.length > 0)
}

const getExportLineLength = (
  node: SourceExportDeclaration,
  options: Options,
  sourceColumn: number
): number => getSourceLineLength(sourceColumn, node.source, options)

const isExportAlignGroupMember = (
  node: Node,
  options: Options,
  originalText: string | undefined
): node is AlignableExportDeclaration =>
  isLocatedSourceExportDeclaration(node) &&
  !hasExportSourceComments(node) &&
  !hasCommentToken(node, originalText) &&
  !hasImportAttributes(node) &&
  !hasUnsupportedImportAssertion(node, originalText)

const isAlignableExportDeclaration = (
  node: SourceExportDeclaration,
  options: Options,
  originalText: string | undefined,
  printWidth: number
): boolean =>
  !hasExportSourceComments(node) &&
  !hasCommentToken(node, originalText) &&
  !hasImportAttributes(node) &&
  !hasUnsupportedImportAssertion(node, originalText) &&
  getExportLineLength(node, options, getExportSourceColumn(node, options, originalText)) <=
    printWidth

const getMaxExportSourceColumn = (
  nodes: Array<SourceExportDeclaration>,
  options: Options,
  originalText: string | undefined
): number =>
  nodes.length > 0
    ? Math.max(...nodes.map((node) => getExportSourceColumn(node, options, originalText)))
    : 0

const getAlignableExportNodes = (
  nodes: Array<SourceExportDeclaration>,
  options: Options,
  originalText: string | undefined,
  printWidth: number
): Array<SourceExportDeclaration> => {
  let alignableNodes = nodes.filter((node) =>
    isAlignableExportDeclaration(node, options, originalText, printWidth))

  while (alignableNodes.length > 0) {
    const maxSourceColumn = getMaxExportSourceColumn(alignableNodes, options, originalText)
    const nextAlignableNodes = alignableNodes.filter(
      (node) => getExportLineLength(node, options, maxSourceColumn) <= printWidth
    )

    if (nextAlignableNodes.length === alignableNodes.length) {
      return alignableNodes
    }

    alignableNodes = nextAlignableNodes
  }

  return alignableNodes
}

const setExportAlignOffset = (
  node: AlignableExportDeclaration,
  options: Options,
  originalText: string | undefined,
  maxExportSourceColumn: number
): void => {
  const sourceColumn = getExportSourceColumn(node, options, originalText)

  node.exportSourceAlignOffset =
    sourceColumn < maxExportSourceColumn ? maxExportSourceColumn - sourceColumn : 0
}

const setExportGroupAlignOffsets = (
  nodes: Array<AlignableExportDeclaration>,
  options: Options,
  originalText: string | undefined,
  printWidth: number
): void => {
  const alignableNodes = getAlignableExportNodes(nodes, options, originalText, printWidth)
  const maxExportSourceColumn = getMaxExportSourceColumn(alignableNodes, options, originalText)

  nodes.forEach((node) => {
    node.exportSourceAlignOffset = 0
  })

  alignableNodes.forEach((node) => {
    setExportAlignOffset(node, options, originalText, maxExportSourceColumn)
  })
}

const setExportAlignOffsets = (
  body: Array<Node>,
  options: Options,
  originalText: string | undefined,
  printWidth: number
): void => {
  let group: Array<AlignableExportDeclaration> = []

  const flushGroup = (): void => {
    setExportGroupAlignOffsets(group, options, originalText, printWidth)
    group = []
  }

  body.forEach((node) => {
    if (isExportAlignGroupMember(node, options, originalText)) {
      group.push(node)
    } else if (group.length > 0) {
      flushGroup()
    }
  })

  if (group.length > 0) {
    flushGroup()
  }
}

export const setExportSourceAlignOffsets = (ast: AST, options: Options): void => {
  const body = ast.body as Array<Node>
  const comments: Array<LocatedComment> =
    (ast as { comments?: Array<LocatedComment> | null }).comments ?? []
  const { originalText } = options as OriginalTextOptions
  const printWidth = getPrintWidth(options)

  markExportAlignBlockedComments(body, comments)
  setExportAlignOffsets(body, options, originalText, printWidth)
}

export const alignExportFromDocPart = (part: unknown, node: SourceExportDeclaration): unknown => {
  const alignOffset = (node as AlignableExportDeclaration).exportSourceAlignOffset

  return alignFromDocPart(part, alignOffset)
}
