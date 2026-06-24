import type { ExportAllDeclaration }   from '@babel/types'
import type { ExportNamedDeclaration } from '@babel/types'
import type { ImportDeclaration }      from '@babel/types'
import type { Node }                   from '@babel/types'
import type { Options }                from 'prettier'
import type { Printer }                from 'prettier'
import type { AST }                    from 'prettier'

import * as estree                     from 'prettier/plugins/estree'

const estreePrinter = (estree as unknown as { printers: Record<string, Printer> }).printers.estree

const fromDocPart = ' from'
const fromClause = ' from '
const defaultPrintWidth = 80
const sourceColumnOffset = 6
const namedSpecifiersSourceColumnOffset = 8
const exportAllSourceColumn = 'export * from '.length
const exportTypeAllSourceColumn = 'export type * from '.length

type ModuleSourceDeclaration = ExportAllDeclaration | ExportNamedDeclaration | ImportDeclaration

type AlignableModuleSourceDeclaration = ModuleSourceDeclaration & {
  alignBlocked?: boolean
  alignOffset?: number
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

type AttributedModuleSourceDeclaration = ModuleSourceDeclaration & {
  assertions?: Array<ImportAttributeNode> | null
  attributes?: Array<ImportAttributeNode> | null
}

type OriginalTextOptions = Options & {
  originalText?: string
}

const isImportSourceDeclaration = (node: Node): node is ImportDeclaration =>
  node.type === 'ImportDeclaration' && node.specifiers.length > 0

const isExportSourceDeclaration = (
  node: Node
): node is ExportAllDeclaration | ExportNamedDeclaration =>
  (node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') &&
  Boolean(node.source)

const getImportSourceColumn = (node: ImportDeclaration): number => {
  const specifier = node.specifiers[node.specifiers.length - 1]

  if (!specifier.loc) {
    return 0
  }

  const offset = 'imported' in specifier ? namedSpecifiersSourceColumnOffset : sourceColumnOffset

  return specifier.loc.end.column + offset
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

const getFallbackModuleSourceColumn = (node: ModuleSourceDeclaration): number => {
  if (node.type === 'ImportDeclaration') {
    return getImportSourceColumn(node)
  }

  if (node.type === 'ExportAllDeclaration') {
    return getExportAllSourceColumn(node)
  }

  return getExportNamedSourceColumn(node)
}

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

const getSourceText = (node: ModuleSourceDeclaration, options: Options): string | undefined =>
  typeof node.source?.value === 'string' ? quoteLiteralValue(node.source.value, options) : undefined

const getImportAttributeText = (
  attribute: ImportAttributeNode,
  options: Options
): string | undefined => {
  const key = getPrintedNodeName(attribute.key, options)
  const value = getPrintedNodeName(attribute.value, options)

  return key && value ? `${key}: ${value}` : undefined
}

const getImportAttributesText = (
  node: ModuleSourceDeclaration,
  options: Options
): string | undefined => {
  const attributedNode = node as AttributedModuleSourceDeclaration
  const importAttributeKeyword = attributedNode.attributes ? 'with' : 'assert'
  const attributes = attributedNode.attributes ?? attributedNode.assertions ?? []

  if (attributes.length === 0) {
    return ''
  }

  const attributeTexts = attributes.map((attribute) => getImportAttributeText(attribute, options))

  if (attributeTexts.some((attribute) => !attribute)) {
    return undefined
  }

  return ` ${importAttributeKeyword} { ${(attributeTexts as Array<string>).join(', ')} }`
}

const getStatementTerminatorText = (options: Options): string => (options.semi === false ? '' : ';')

const hasComments = (node: CommentedNode | null | undefined): boolean =>
  Boolean(
    node &&
      ((node.leadingComments && node.leadingComments.length > 0) ||
        (node.innerComments && node.innerComments.length > 0) ||
        (node.trailingComments && node.trailingComments.length > 0))
  )

const hasModuleSourceComments = (node: ModuleSourceDeclaration): boolean =>
  Boolean((node as AlignableModuleSourceDeclaration).alignBlocked) ||
  hasComments(node as CommentedNode) ||
  hasComments(node.source as CommentedNode | undefined) ||
  ('specifiers' in node &&
    node.specifiers.some((specifier) => {
      const commentedSpecifier = specifier as CommentedNode & {
        exported?: CommentedNode | null
        imported?: CommentedNode | null
        local?: CommentedNode | null
      }

      return (
        hasComments(commentedSpecifier) ||
        hasComments(commentedSpecifier.local) ||
        hasComments(commentedSpecifier.imported) ||
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

const markAlignBlockedComments = (
  body: Array<Node>,
  comments: Array<LocatedComment>,
  originalText: string | undefined
): void => {
  body.forEach((node) => {
    if (
      (isImportSourceDeclaration(node) || isExportSourceDeclaration(node)) &&
      (hasCommentToken(node, originalText) ||
        comments.some((comment) => isCommentInsideNode(node, comment)))
    ) {
      const alignableNode = node as AlignableModuleSourceDeclaration

      alignableNode.alignBlocked = true
    }
  })
}

const getImportSpecifierText = (
  node: ImportDeclaration,
  specifier: ImportDeclaration['specifiers'][number],
  options: Options
): string | undefined => {
  switch (specifier.type) {
    case 'ImportDefaultSpecifier': {
      return getPrintedNodeName(specifier.local, options)
    }
    case 'ImportNamespaceSpecifier': {
      const localName = getPrintedNodeName(specifier.local, options)

      return localName ? `* as ${localName}` : undefined
    }
    case 'ImportSpecifier': {
      const importedName = getPrintedNodeName(specifier.imported, options)
      const localName = getPrintedNodeName(specifier.local, options)

      if (!importedName || !localName) {
        return undefined
      }

      const typePrefix =
        node.importKind !== 'type' && specifier.importKind === 'type' ? 'type ' : ''

      return importedName === localName
        ? `${typePrefix}${importedName}`
        : `${typePrefix}${importedName} as ${localName}`
    }
    default: {
      return undefined
    }
  }
}

const getWrappedSpecifiersText = (specifiers: Array<string>, options: Options): string => {
  const spacing = options.bracketSpacing === false ? '' : ' '

  return `{${spacing}${specifiers.join(', ')}${spacing}}`
}

const getImportSpecifiersText = (node: ImportDeclaration, options: Options): string | undefined => {
  const defaultSpecifier = node.specifiers.find(
    (specifier) => specifier.type === 'ImportDefaultSpecifier'
  )
  const namespaceSpecifier = node.specifiers.find(
    (specifier) => specifier.type === 'ImportNamespaceSpecifier'
  )
  const namedSpecifiers = node.specifiers.filter(
    (specifier) => specifier.type === 'ImportSpecifier'
  )
  const namedSpecifierTexts = namedSpecifiers.map((specifier) =>
    getImportSpecifierText(node, specifier, options))

  if (namedSpecifierTexts.some((specifier) => !specifier)) {
    return undefined
  }

  const specifierTexts = [
    defaultSpecifier ? getImportSpecifierText(node, defaultSpecifier, options) : undefined,
    namespaceSpecifier ? getImportSpecifierText(node, namespaceSpecifier, options) : undefined,
    namedSpecifierTexts.length > 0
      ? getWrappedSpecifiersText(namedSpecifierTexts as Array<string>, options)
      : undefined,
  ].filter((specifier): specifier is string => Boolean(specifier))

  return specifierTexts.length > 0 ? specifierTexts.join(', ') : undefined
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
  if (node.specifiers.length === 0) {
    return undefined
  }

  const specifierTexts = node.specifiers.map((specifier) =>
    getExportSpecifierText(node, specifier, options))

  if (specifierTexts.some((specifier) => !specifier)) {
    return undefined
  }

  return getWrappedSpecifiersText(specifierTexts as Array<string>, options)
}

const getProjectedImportSourceColumn = (
  node: ImportDeclaration,
  options: Options
): number | undefined => {
  const specifiersText = getImportSpecifiersText(node, options)

  if (!specifiersText) {
    return undefined
  }

  const importKeyword = node.importKind === 'type' ? 'import type' : 'import'

  return `${importKeyword} ${specifiersText}${fromClause}`.length
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

const getProjectedModuleSourceColumn = (
  node: ModuleSourceDeclaration,
  options: Options
): number | undefined => {
  if (hasModuleSourceComments(node)) {
    return undefined
  }

  if (node.type === 'ImportDeclaration') {
    return getProjectedImportSourceColumn(node, options)
  }

  if (node.type === 'ExportAllDeclaration') {
    return getProjectedExportAllSourceColumn(node, options)
  }

  return getProjectedExportNamedSourceColumn(node, options)
}

const getModuleSourceColumn = (node: ModuleSourceDeclaration, options: Options): number => {
  const projectedSourceColumn = getProjectedModuleSourceColumn(node, options)

  return projectedSourceColumn ?? getFallbackModuleSourceColumn(node)
}

const getProjectedModuleLineLength = (
  node: ModuleSourceDeclaration,
  options: Options,
  sourceColumn = getProjectedModuleSourceColumn(node, options)
): number | undefined => {
  const sourceText = getSourceText(node, options)
  const importAttributesText = getImportAttributesText(node, options)

  if (
    sourceColumn === undefined ||
    sourceText === undefined ||
    importAttributesText === undefined
  ) {
    return undefined
  }

  return (
    sourceColumn +
    sourceText.length +
    importAttributesText.length +
    getStatementTerminatorText(options).length
  )
}

const isAlignableModuleSourceDeclaration = (
  node: ModuleSourceDeclaration,
  options: Options,
  printWidth: number
): boolean => {
  const lineLength = getProjectedModuleLineLength(node, options)

  return lineLength !== undefined && lineLength <= printWidth
}

const getMaxModuleSourceColumn = (
  nodes: Array<ModuleSourceDeclaration>,
  options: Options,
  printWidth: number
): number => {
  const alignableNodes = nodes.filter((node) =>
    isAlignableModuleSourceDeclaration(node, options, printWidth))

  return alignableNodes.length > 0
    ? Math.max(...alignableNodes.map((node) => getModuleSourceColumn(node, options)))
    : 0
}

const setAlignOffset = (
  node: AlignableModuleSourceDeclaration,
  options: Options,
  maxModuleSourceColumn: number
): void => {
  const moduleSourceColumn = getModuleSourceColumn(node, options)

  node.alignOffset =
    moduleSourceColumn < maxModuleSourceColumn ? maxModuleSourceColumn - moduleSourceColumn : 0
}

const getAlignableNodes = (
  nodes: Array<ModuleSourceDeclaration>,
  options: Options,
  printWidth: number
): Array<ModuleSourceDeclaration> => {
  let alignableNodes = nodes.filter((node) =>
    isAlignableModuleSourceDeclaration(node, options, printWidth))

  while (alignableNodes.length > 0) {
    const maxModuleSourceColumn = getMaxModuleSourceColumn(alignableNodes, options, printWidth)
    const nextAlignableNodes = alignableNodes.filter((node) => {
      const lineLength = getProjectedModuleLineLength(node, options, maxModuleSourceColumn)

      return lineLength !== undefined && lineLength <= printWidth
    })

    if (nextAlignableNodes.length === alignableNodes.length) {
      return alignableNodes
    }

    alignableNodes = nextAlignableNodes
  }

  return alignableNodes
}

const setGroupAlignOffsets = (
  nodes: Array<AlignableModuleSourceDeclaration>,
  options: Options,
  printWidth: number
): void => {
  const alignableNodes = getAlignableNodes(nodes, options, printWidth)
  const maxModuleSourceColumn = getMaxModuleSourceColumn(alignableNodes, options, printWidth)

  nodes.forEach((node) => {
    node.alignOffset = 0
  })

  alignableNodes.forEach((node) => {
    setAlignOffset(node, options, maxModuleSourceColumn)
  })
}

const setAlignOffsets = <T extends ModuleSourceDeclaration>(
  body: Array<Node>,
  predicate: (node: Node) => node is T,
  options: Options,
  printWidth: number
): void => {
  let group: Array<AlignableModuleSourceDeclaration> = []

  const flushGroup = (): void => {
    setGroupAlignOffsets(group, options, printWidth)
    group = []
  }

  body.forEach((node) => {
    if (predicate(node)) {
      group.push(node)
    } else if (group.length > 0) {
      flushGroup()
    }
  })

  if (group.length > 0) {
    flushGroup()
  }
}

const alignFromDocPart = (part: unknown, node: AlignableModuleSourceDeclaration): unknown => {
  if (Array.isArray(part) && part[0] === fromDocPart && node.alignOffset && node.alignOffset > 0) {
    part[0] = `${''.padStart(node.alignOffset, ' ')}${fromDocPart}`
  }

  return part
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const print: Printer<Node>['print'] = (path, options, prnt): any => {
  const node = path.getNode()
  let result = estreePrinter.print(path, options, prnt)

  if (
    node &&
    (isImportSourceDeclaration(node) || isExportSourceDeclaration(node)) &&
    Array.isArray(result)
  ) {
    // @ts-expect-error explicit any type
    result = result.map((part) => alignFromDocPart(part, node))
  }

  return result
}

export const preprocess = async (ast: AST, options: Options): Promise<AST> => {
  const body = ast.body as Array<Node>
  const comments: Array<LocatedComment> =
    (ast as { comments?: Array<LocatedComment> | null }).comments ?? []
  const { originalText } = options as OriginalTextOptions
  const printWidth = getPrintWidth(options)

  markAlignBlockedComments(body, comments, originalText)
  setAlignOffsets(body, isImportSourceDeclaration, options, printWidth)
  setAlignOffsets(body, isExportSourceDeclaration, options, printWidth)

  return ast
}

export const printers: Record<string, Printer> = {
  'typescript-custom': {
    ...estreePrinter,
    preprocess,
    print,
  },
}
