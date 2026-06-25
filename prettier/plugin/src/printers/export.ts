import type { ExportAllDeclaration }   from '@babel/types'
import type { ExportNamedDeclaration } from '@babel/types'
import type { Node }                   from '@babel/types'
import type { Options }                from 'prettier'
import type { AST }                    from 'prettier'

const fromDocPart = ' from'
const fromClause = ' from '
const defaultPrintWidth = 80
const namedSpecifiersSourceColumnOffset = 8
const exportAllSourceColumn = 'export * from '.length
const exportTypeAllSourceColumn = 'export type * from '.length
const unsupportedImportAssertionPattern = /^\s*assert\s*\{/u
const identifierNamePattern = /^[$A-Z_a-z][$\dA-Z_a-z]*$/u

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
  start?: number | null
}

type ImportAttributeNode = {
  key?: { name?: string; value?: unknown } | null
  value?: { name?: string; value?: unknown } | null
}

type AttributedExportDeclaration = SourceExportDeclaration & {
  assertions?: Array<ImportAttributeNode> | null
  attributes?: Array<ImportAttributeNode> | null
}

type OriginalTextOptions = Options & {
  originalText?: string
}

export const isSourceExportDeclaration = (node: Node): node is SourceExportDeclaration =>
  (node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') &&
  Boolean(node.source)

const getPrintWidth = (options: Options): number => options.printWidth ?? defaultPrintWidth

const countCharacters = (value: string, character: '"' | "'"): number =>
  [...value].filter((current) => current === character).length

const getPreferredLiteralQuote = (options: Options): '"' | "'" =>
  options.singleQuote === false ? '"' : "'"

const getLiteralQuote = (value: string, options: Options): '"' | "'" => {
  const preferredQuote = getPreferredLiteralQuote(options)
  const fallbackQuote = preferredQuote === "'" ? '"' : "'"

  return countCharacters(value, fallbackQuote) < countCharacters(value, preferredQuote)
    ? fallbackQuote
    : preferredQuote
}

const quoteLiteralValue = (value: string, options: Options): string => {
  const quote = getLiteralQuote(value, options)
  const doubleQuotedValue = JSON.stringify(value)

  if (quote === '"') {
    return doubleQuotedValue
  }

  return `'${doubleQuotedValue.slice(1, -1).replaceAll('\\"', '"').replaceAll("'", "\\'")}'`
}

const getPrintedNodeName = (
  node: { name?: string; value?: unknown } | null | undefined,
  options: Options
): string | undefined => {
  if (!node) {
    return undefined
  }

  if (typeof node.name === 'string') {
    return node.name
  }

  if (typeof node.value === 'string') {
    return quoteLiteralValue(node.value, options)
  }

  return undefined
}

const getPrintedAttributeKeyName = (
  node: { name?: string; value?: unknown } | null | undefined,
  options: Options
): string | undefined => {
  if (!node) {
    return undefined
  }

  if (typeof node.name === 'string') {
    return node.name
  }

  if (typeof node.value === 'string') {
    return identifierNamePattern.test(node.value)
      ? node.value
      : quoteLiteralValue(node.value, options)
  }

  return undefined
}

const getSourceText = (node: SourceExportDeclaration, options: Options): string | undefined =>
  typeof node.source?.value === 'string' ? quoteLiteralValue(node.source.value, options) : undefined

const getWrappedSpecifiersText = (specifiers: Array<string>, options: Options): string => {
  if (specifiers.length === 0) {
    return '{}'
  }

  const spacing = options.bracketSpacing === false ? '' : ' '

  return `{${spacing}${specifiers.join(', ')}${spacing}}`
}

const getExportAttributeText = (
  attribute: ImportAttributeNode,
  options: Options
): string | undefined => {
  const key = getPrintedAttributeKeyName(attribute.key, options)
  const value = getPrintedNodeName(attribute.value, options)

  return key && value ? `${key}: ${value}` : undefined
}

const getExportAttributesText = (
  node: SourceExportDeclaration,
  options: Options
): string | undefined => {
  const attributedNode = node as AttributedExportDeclaration
  const attributes = attributedNode.attributes ?? []

  if (attributes.length === 0) {
    return ''
  }

  const attributeTexts = attributes.map((attribute) => getExportAttributeText(attribute, options))

  if (attributeTexts.some((attribute) => !attribute)) {
    return undefined
  }

  return ` with ${getWrappedSpecifiersText(attributeTexts as Array<string>, options)}`
}

const getStatementTerminatorText = (options: Options): string => (options.semi === false ? '' : ';')

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

const getLocationOffset = (
  originalText: string,
  location: {
    column: number
    line: number
  }
): number => {
  let offset = 0
  let line = 1

  while (line < location.line) {
    const nextLineOffset = originalText.indexOf('\n', offset)

    if (nextLineOffset < 0) {
      return originalText.length
    }

    offset = nextLineOffset + 1
    line += 1
  }

  return offset + location.column
}

const getOriginalNodeText = (node: Node, originalText: string): string | undefined => {
  const { end, start } = node as RangedNode

  if (typeof start === 'number' && typeof end === 'number') {
    return originalText.slice(start, end)
  }

  if (!node.loc) {
    return undefined
  }

  return originalText.slice(
    getLocationOffset(originalText, node.loc.start),
    getLocationOffset(originalText, node.loc.end)
  )
}

const getNodeEndOffset = (node: Node, originalText: string): number | undefined => {
  const { end } = node as RangedNode

  if (typeof end === 'number') {
    return end
  }

  if (!node.loc) {
    return undefined
  }

  return getLocationOffset(originalText, node.loc.end)
}

const getOriginalSourceSuffixText = (
  node: SourceExportDeclaration,
  originalText: string
): string | undefined => {
  const sourceNode = node.source as Node | null | undefined
  const sourceEnd = sourceNode ? getNodeEndOffset(sourceNode, originalText) : undefined
  const nodeEnd = getNodeEndOffset(node, originalText)

  if (sourceEnd === undefined || nodeEnd === undefined) {
    return undefined
  }

  return originalText.slice(sourceEnd, nodeEnd)
}

const hasUnsupportedImportAssertion = (
  node: SourceExportDeclaration,
  options: Options
): boolean => {
  const attributedNode = node as AttributedExportDeclaration

  if (
    attributedNode.assertions &&
    attributedNode.assertions.length > 0 &&
    !attributedNode.attributes
  ) {
    return true
  }

  const { originalText } = options as OriginalTextOptions

  if (!originalText) {
    return false
  }

  const sourceSuffixText = getOriginalSourceSuffixText(node, originalText)

  return sourceSuffixText ? unsupportedImportAssertionPattern.test(sourceSuffixText) : false
}

const hasCommentToken = (node: Node, originalText: string | undefined): boolean => {
  if (!originalText) {
    return false
  }

  const originalNodeText = getOriginalNodeText(node, originalText)

  if (!originalNodeText) {
    return false
  }

  let quote: string | undefined

  for (let index = 0; index < originalNodeText.length; index += 1) {
    const current = originalNodeText[index]
    const next = originalNodeText[index + 1]

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

const markExportAlignBlockedComments = (
  body: Array<Node>,
  comments: Array<LocatedComment>,
  originalText: string | undefined
): void => {
  body.forEach((node) => {
    if (
      isSourceExportDeclaration(node) &&
      (hasCommentToken(node, originalText) ||
        comments.some((comment) => isCommentInsideNode(node, comment)))
    ) {
      const alignableNode = node as AlignableExportDeclaration

      alignableNode.exportSourceAlignBlocked = true
    }
  })
}

const getExportAllSourceColumn = (node: ExportAllDeclaration): number =>
  node.exportKind === 'type' ? exportTypeAllSourceColumn : exportAllSourceColumn

const getExportNamedSourceColumn = (node: ExportNamedDeclaration): number => {
  if (node.specifiers.length === 0) {
    return node.source?.loc?.start.column ?? 0
  }

  const specifier = node.specifiers[node.specifiers.length - 1]

  if (!specifier.loc) {
    return node.source?.loc?.start.column ?? 0
  }

  return specifier.loc.end.column + namedSpecifiersSourceColumnOffset
}

const getFallbackExportSourceColumn = (node: SourceExportDeclaration): number => {
  if (node.type === 'ExportAllDeclaration') {
    return getExportAllSourceColumn(node)
  }

  return getExportNamedSourceColumn(node)
}

const getExportSpecifierText = (
  node: ExportNamedDeclaration,
  specifier: ExportNamedDeclaration['specifiers'][number],
  options: Options
): string | undefined => {
  switch (specifier.type) {
    case 'ExportSpecifier': {
      const localName = getPrintedNodeName(specifier.local, options)
      const exportedName = getPrintedNodeName(specifier.exported, options)

      if (!localName || !exportedName) {
        return undefined
      }

      const typePrefix =
        node.exportKind !== 'type' && specifier.exportKind === 'type' ? 'type ' : ''

      return localName === exportedName
        ? `${typePrefix}${localName}`
        : `${typePrefix}${localName} as ${exportedName}`
    }
    case 'ExportNamespaceSpecifier': {
      const exportedName = getPrintedNodeName(specifier.exported, options)

      return exportedName ? `* as ${exportedName}` : undefined
    }
    default: {
      return undefined
    }
  }
}

const getExportSpecifiersText = (
  node: ExportNamedDeclaration,
  options: Options
): string | undefined => {
  const specifierTexts = node.specifiers.map((specifier) =>
    getExportSpecifierText(node, specifier, options))

  if (specifierTexts.some((specifier) => !specifier)) {
    return undefined
  }

  return getWrappedSpecifiersText(specifierTexts as Array<string>, options)
}

const getProjectedExportAllSourceColumn = (
  node: ExportAllDeclaration,
  options: Options
): number | undefined => {
  const exportedName = getPrintedNodeName(
    (
      node as ExportAllDeclaration & {
        exported?: { name?: string; value?: unknown } | null
      }
    ).exported,
    options
  )
  const exportKeyword = node.exportKind === 'type' ? 'export type *' : 'export *'
  const exportClause = exportedName ? `${exportKeyword} as ${exportedName}` : exportKeyword

  return `${exportClause}${fromClause}`.length
}

const getProjectedExportNamedSourceColumn = (
  node: ExportNamedDeclaration,
  options: Options
): number | undefined => {
  const specifiersText = getExportSpecifiersText(node, options)

  if (!specifiersText) {
    return undefined
  }

  const exportKeyword = node.exportKind === 'type' ? 'export type' : 'export'

  return `${exportKeyword} ${specifiersText}${fromClause}`.length
}

const getProjectedExportSourceColumn = (
  node: SourceExportDeclaration,
  options: Options
): number | undefined => {
  if (hasExportSourceComments(node)) {
    return undefined
  }

  if (node.type === 'ExportAllDeclaration') {
    return getProjectedExportAllSourceColumn(node, options)
  }

  return getProjectedExportNamedSourceColumn(node, options)
}

const getExportSourceColumn = (node: SourceExportDeclaration, options: Options): number => {
  const projectedSourceColumn = getProjectedExportSourceColumn(node, options)

  return projectedSourceColumn ?? getFallbackExportSourceColumn(node)
}

const getProjectedExportLineLength = (
  node: SourceExportDeclaration,
  options: Options,
  sourceColumn = getProjectedExportSourceColumn(node, options)
): number | undefined => {
  if (hasUnsupportedImportAssertion(node, options)) {
    return undefined
  }

  const sourceText = getSourceText(node, options)
  const attributesText = getExportAttributesText(node, options)

  if (sourceColumn === undefined || sourceText === undefined || attributesText === undefined) {
    return undefined
  }

  return (
    sourceColumn +
    sourceText.length +
    attributesText.length +
    getStatementTerminatorText(options).length
  )
}

const isAlignableExportDeclaration = (
  node: SourceExportDeclaration,
  options: Options,
  printWidth: number
): boolean => {
  const lineLength = getProjectedExportLineLength(node, options)

  return lineLength !== undefined && lineLength <= printWidth
}

const getMaxExportSourceColumn = (
  nodes: Array<SourceExportDeclaration>,
  options: Options,
  printWidth: number
): number => {
  const alignableNodes = nodes.filter((node) =>
    isAlignableExportDeclaration(node, options, printWidth))

  return alignableNodes.length > 0
    ? Math.max(...alignableNodes.map((node) => getExportSourceColumn(node, options)))
    : 0
}

const setExportAlignOffset = (
  node: AlignableExportDeclaration,
  options: Options,
  maxExportSourceColumn: number
): void => {
  const sourceColumn = getExportSourceColumn(node, options)

  node.exportSourceAlignOffset =
    sourceColumn < maxExportSourceColumn ? maxExportSourceColumn - sourceColumn : 0
}

const getAlignableExportNodes = (
  nodes: Array<SourceExportDeclaration>,
  options: Options,
  printWidth: number
): Array<SourceExportDeclaration> => {
  let alignableNodes = nodes.filter((node) =>
    isAlignableExportDeclaration(node, options, printWidth))

  while (alignableNodes.length > 0) {
    const maxSourceColumn = getMaxExportSourceColumn(alignableNodes, options, printWidth)
    const nextAlignableNodes = alignableNodes.filter((node) => {
      const lineLength = getProjectedExportLineLength(node, options, maxSourceColumn)

      return lineLength !== undefined && lineLength <= printWidth
    })

    if (nextAlignableNodes.length === alignableNodes.length) {
      return alignableNodes
    }

    alignableNodes = nextAlignableNodes
  }

  return alignableNodes
}

const setExportGroupAlignOffsets = (
  nodes: Array<AlignableExportDeclaration>,
  options: Options,
  printWidth: number
): void => {
  const alignableNodes = getAlignableExportNodes(nodes, options, printWidth)
  const maxExportSourceColumn = getMaxExportSourceColumn(alignableNodes, options, printWidth)

  nodes.forEach((node) => {
    node.exportSourceAlignOffset = 0
  })

  alignableNodes.forEach((node) => {
    setExportAlignOffset(node, options, maxExportSourceColumn)
  })
}

const setExportAlignOffsets = (body: Array<Node>, options: Options, printWidth: number): void => {
  let group: Array<AlignableExportDeclaration> = []

  const flushGroup = (): void => {
    setExportGroupAlignOffsets(group, options, printWidth)
    group = []
  }

  body.forEach((node) => {
    if (isSourceExportDeclaration(node)) {
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

  markExportAlignBlockedComments(body, comments, originalText)
  setExportAlignOffsets(body, options, printWidth)
}

export const alignExportFromDocPart = (part: unknown, node: SourceExportDeclaration): unknown => {
  const alignOffset = (node as AlignableExportDeclaration).exportSourceAlignOffset

  if (Array.isArray(part) && part[0] === fromDocPart && alignOffset && alignOffset > 0) {
    part[0] = `${''.padStart(alignOffset, ' ')}${fromDocPart}`
  }

  return part
}
