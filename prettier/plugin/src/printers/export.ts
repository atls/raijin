import type { ExportAllDeclaration }   from '@babel/types'
import type { ExportNamedDeclaration } from '@babel/types'
import type { Node }                   from '@babel/types'
import type { Options }                from 'prettier'
import type { AST }                    from 'prettier'

const fromDocPart = ' from'
const defaultPrintWidth = 80
const sourceColumnOffset = 6
const namedSpecifiersSourceColumnOffset = 8
const compactNamedSpecifiersSourceColumnOffset = 6
const compactPrintedNamedSpecifiersSourceColumnOffset = 7
const exportAllSourceColumn = 'export * from '.length
const exportTypeAllSourceColumn = 'export type * from '.length
const emptyNamedExportSourceColumn = 'export {} from '.length
const exportNamedPrefixLength = 'export { '.length
const exportTypeNamedPrefixLength = 'export type { '.length
const unsupportedImportAssertionPattern = /^\s*assert\s*\{/u

type SourceExportDeclaration = ExportAllDeclaration | ExportNamedDeclaration

type AlignableExportDeclaration = SourceExportDeclaration & {
  exportSourceAlignBlocked?: boolean
  exportSourceAlignOffset?: number
}

type CommentedNode = {
  innerComments?: Array<unknown> | null
  leadingComments?: Array<unknown> | null
  trailingComments?: Array<unknown> | null
}

type LocatedComment = {
  loc?: {
    end: {
      column: number
      line: number
    }
    start: {
      column: number
      line: number
    }
  }
}

type RangedNode = {
  end?: number | null
  range?: [number, number] | null
}

type AttributedExportDeclaration = SourceExportDeclaration & {
  attributes?: Array<unknown> | null
}

type OriginalTextOptions = Options & {
  originalText?: string
}

export const isSourceExportDeclaration = (node: Node): node is SourceExportDeclaration =>
  (node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') &&
  Boolean(node.source)

const getPrintWidth = (options: Options): number => options.printWidth ?? defaultPrintWidth

const hasComments = (node: CommentedNode | null | undefined): boolean =>
  Boolean(
    node &&
      ((node.leadingComments && node.leadingComments.length > 0) ||
        (node.innerComments && node.innerComments.length > 0) ||
        (node.trailingComments && node.trailingComments.length > 0))
  )

const hasExportSourceComments = (node: SourceExportDeclaration): boolean =>
  Boolean((node as AlignableExportDeclaration).exportSourceAlignBlocked) ||
  hasComments(node as CommentedNode) ||
  hasComments(node.source as CommentedNode | undefined) ||
  ('specifiers' in node &&
    node.specifiers.some((specifier) => {
      const commentedSpecifier = specifier as CommentedNode & {
        exported?: CommentedNode | null
        local?: CommentedNode | null
      }

      return (
        hasComments(commentedSpecifier) ||
        hasComments(commentedSpecifier.local) ||
        hasComments(commentedSpecifier.exported)
      )
    }))

const isCommentInsideNode = (node: Node, comment: LocatedComment): boolean => {
  if (!node.loc || !comment.loc) {
    return false
  }

  const startsAfterNode =
    comment.loc.start.line > node.loc.start.line ||
    (comment.loc.start.line === node.loc.start.line &&
      comment.loc.start.column >= node.loc.start.column)
  const endsBeforeNode =
    comment.loc.end.line < node.loc.end.line ||
    (comment.loc.end.line === node.loc.end.line && comment.loc.end.column <= node.loc.end.column)

  return startsAfterNode && endsBeforeNode
}

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

const getRangeEnd = (node: RangedNode | null | undefined): number | undefined => {
  if (!node) {
    return undefined
  }

  if (node.range) {
    return node.range[1]
  }

  return typeof node.end === 'number' ? node.end : undefined
}

const getRangeStart = (node: RangedNode | null | undefined): number | undefined => {
  if (!node) {
    return undefined
  }

  if (node.range) {
    return node.range[0]
  }

  return undefined
}

const getExportAllSourceColumn = (node: ExportAllDeclaration): number => {
  const { exported } = node as ExportAllDeclaration & {
    exported?: Node | null
  }

  if (exported?.loc) {
    return exported.loc.end.column + sourceColumnOffset
  }

  return node.exportKind === 'type' ? exportTypeAllSourceColumn : exportAllSourceColumn
}

const getNamedSpecifiersSourceColumnOffset = (
  specifier: ExportNamedDeclaration['specifiers'][number],
  options: Options,
  originalText: string | undefined
): number => {
  const specifierEnd = getRangeEnd(specifier as RangedNode)
  const hasCompactClosingBrace =
    originalText && specifierEnd !== undefined ? originalText[specifierEnd] === '}' : false

  if (options.bracketSpacing === false) {
    return hasCompactClosingBrace
      ? compactPrintedNamedSpecifiersSourceColumnOffset
      : compactNamedSpecifiersSourceColumnOffset
  }

  return hasCompactClosingBrace
    ? namedSpecifiersSourceColumnOffset + 1
    : namedSpecifiersSourceColumnOffset
}

const getSpecifierTextLength = (
  specifier: ExportNamedDeclaration['specifiers'][number],
  originalText: string | undefined
): number | undefined => {
  const start = getRangeStart(specifier as RangedNode)
  const end = getRangeEnd(specifier as RangedNode)

  return originalText && start !== undefined && end !== undefined
    ? originalText.slice(start, end).trim().length
    : undefined
}

const getSpecifiersTextLength = (
  specifiers: ExportNamedDeclaration['specifiers'],
  originalText: string | undefined
): number | undefined => {
  let length = 0

  for (const specifier of specifiers) {
    const specifierLength = getSpecifierTextLength(specifier, originalText)

    if (specifierLength === undefined) {
      return undefined
    }

    length += specifierLength
  }

  return length + Math.max(specifiers.length - 1, 0) * ', '.length
}

const getMultilineExportNamedSourceColumn = (
  node: ExportNamedDeclaration,
  options: Options,
  originalText: string | undefined
): number | undefined => {
  if (
    node.specifiers.length === 0 ||
    !node.source?.loc ||
    !node.loc ||
    node.loc.start.line === node.source.loc.start.line
  ) {
    return undefined
  }

  const specifiersLength = getSpecifiersTextLength(node.specifiers, originalText)

  if (specifiersLength === undefined) {
    return undefined
  }

  const prefixLength =
    node.exportKind === 'type' ? exportTypeNamedPrefixLength : exportNamedPrefixLength
  const bracketSpacingOffset =
    options.bracketSpacing === false
      ? compactPrintedNamedSpecifiersSourceColumnOffset
      : namedSpecifiersSourceColumnOffset

  return prefixLength + specifiersLength + bracketSpacingOffset
}

const getExportNamedSourceColumn = (
  node: ExportNamedDeclaration,
  options: Options,
  originalText: string | undefined
): number => {
  const multilineSourceColumn = getMultilineExportNamedSourceColumn(node, options, originalText)

  if (multilineSourceColumn !== undefined) {
    return multilineSourceColumn
  }

  if (node.specifiers.length === 0) {
    return emptyNamedExportSourceColumn
  }

  const specifier = node.specifiers[node.specifiers.length - 1]

  if (!specifier.loc) {
    return node.source?.loc?.start.column ?? 0
  }

  return (
    specifier.loc.end.column +
    getNamedSpecifiersSourceColumnOffset(specifier, options, originalText)
  )
}

const getExportSourceColumn = (
  node: SourceExportDeclaration,
  options: Options,
  originalText: string | undefined
): number =>
  node.type === 'ExportAllDeclaration'
    ? getExportAllSourceColumn(node)
    : getExportNamedSourceColumn(node, options, originalText)

const getOriginalNodeText = (node: Node, originalText: string | undefined): string | undefined => {
  const start = getRangeStart(node as RangedNode)
  const end = getRangeEnd(node as RangedNode)

  return originalText && start !== undefined && end !== undefined
    ? originalText.slice(start, end)
    : undefined
}

const hasCommentToken = (node: Node, originalText: string | undefined): boolean => {
  const text = getOriginalNodeText(node, originalText)

  if (!text) {
    return false
  }

  let quote: string | undefined

  for (let index = 0; index < text.length; index += 1) {
    const current = text[index]
    const next = text[index + 1]

    if (quote) {
      if (current === '\\') {
        index += 1
      } else if (current === quote) {
        quote = undefined
      }

      continue
    }

    if (current === '"' || current === "'" || current === '`') {
      quote = current
    } else if ((current === '/' && next === '*') || (current === '/' && next === '/')) {
      return true
    }
  }

  return false
}

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

const hasPrintedStatementTerminator = (suffixText: string): boolean => {
  const trimmedSuffixText = suffixText.trimEnd()

  if (trimmedSuffixText.endsWith(';')) {
    return true
  }

  const lineCommentStart = trimmedSuffixText.indexOf('//')
  const blockCommentStart = trimmedSuffixText.indexOf('/*')
  const commentStart =
    lineCommentStart >= 0 && blockCommentStart >= 0
      ? Math.min(lineCommentStart, blockCommentStart)
      : Math.max(lineCommentStart, blockCommentStart)

  return commentStart > 0 && trimmedSuffixText.slice(0, commentStart).trimEnd().endsWith(';')
}

const getStatementTerminatorLength = (suffixText: string, options: Options): number =>
  options.semi === false || hasPrintedStatementTerminator(suffixText) ? 0 : 1

const getSourceLineSuffixLength = (
  node: SourceExportDeclaration,
  options: Options,
  originalText: string | undefined
): number => {
  const sourceLocation = node.source?.loc

  if (!sourceLocation) {
    return 0
  }

  if (!originalText) {
    return node.loc ? node.loc.end.column - sourceLocation.start.column : 0
  }

  const lines = originalText.split(/\r?\n/u)
  const line = lines[sourceLocation.start.line - 1]
  const suffixText = line ? line.slice(sourceLocation.start.column) : ''

  return suffixText.length + getStatementTerminatorLength(suffixText, options)
}

const getExportLineLength = (
  node: SourceExportDeclaration,
  options: Options,
  originalText: string | undefined,
  sourceColumn: number
): number => sourceColumn + getSourceLineSuffixLength(node, options, originalText)

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
  getExportLineLength(
    node,
    options,
    originalText,
    getExportSourceColumn(node, options, originalText)
  ) <= printWidth

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
      (node) => getExportLineLength(node, options, originalText, maxSourceColumn) <= printWidth
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

  if (Array.isArray(part) && part[0] === fromDocPart && alignOffset && alignOffset > 0) {
    part[0] = `${''.padStart(alignOffset, ' ')}${fromDocPart}`
  }

  return part
}
