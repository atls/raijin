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
const sourceQuoteWidth = 2
const sourceColumnOffset = 6
const namedSpecifiersSourceColumnOffset = 8
const exportAllSourceColumn = 'export * from '.length
const exportTypeAllSourceColumn = 'export type * from '.length

type ModuleSourceDeclaration = ExportAllDeclaration | ExportNamedDeclaration | ImportDeclaration

type AlignableModuleSourceDeclaration = ModuleSourceDeclaration & { alignOffset?: number }

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

const getNodeName = (
  node: { name?: string; value?: unknown } | null | undefined
): string | undefined => {
  if (!node) {
    return undefined
  }

  if (typeof node.name === 'string') {
    return node.name
  }

  if (typeof node.value === 'string') {
    return node.value
  }

  return undefined
}

const getSourceValue = (node: ModuleSourceDeclaration): string | undefined =>
  typeof node.source?.value === 'string' ? node.source.value : undefined

const getExportAllExportedName = (node: ExportAllDeclaration): string | undefined => {
  const { exported } = node as ExportAllDeclaration & {
    exported?: { name?: string; value?: unknown } | null
  }

  return getNodeName(exported)
}

const getImportSpecifierText = (
  node: ImportDeclaration,
  specifier: ImportDeclaration['specifiers'][number]
): string | undefined => {
  switch (specifier.type) {
    case 'ImportDefaultSpecifier': {
      return getNodeName(specifier.local)
    }
    case 'ImportNamespaceSpecifier': {
      const localName = getNodeName(specifier.local)

      return localName ? `* as ${localName}` : undefined
    }
    case 'ImportSpecifier': {
      const importedName = getNodeName(specifier.imported)
      const localName = getNodeName(specifier.local)

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

const getImportSpecifiersText = (node: ImportDeclaration): string | undefined => {
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
    getImportSpecifierText(node, specifier))

  if (namedSpecifierTexts.some((specifier) => !specifier)) {
    return undefined
  }

  const specifierTexts = [
    defaultSpecifier ? getImportSpecifierText(node, defaultSpecifier) : undefined,
    namespaceSpecifier ? getImportSpecifierText(node, namespaceSpecifier) : undefined,
    namedSpecifierTexts.length > 0 ? `{ ${namedSpecifierTexts.join(', ')} }` : undefined,
  ].filter((specifier): specifier is string => Boolean(specifier))

  return specifierTexts.length > 0 ? specifierTexts.join(', ') : undefined
}

const getExportSpecifierText = (
  node: ExportNamedDeclaration,
  specifier: ExportNamedDeclaration['specifiers'][number]
): string | undefined => {
  switch (specifier.type) {
    case 'ExportSpecifier': {
      const localName = getNodeName(specifier.local)
      const exportedName = getNodeName(specifier.exported)

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
      const exportedName = getNodeName(specifier.exported)

      return exportedName ? `* as ${exportedName}` : undefined
    }
    default: {
      return undefined
    }
  }
}

const getExportSpecifiersText = (node: ExportNamedDeclaration): string | undefined => {
  if (node.specifiers.length === 0) {
    return undefined
  }

  const specifierTexts = node.specifiers.map((specifier) => getExportSpecifierText(node, specifier))

  if (specifierTexts.some((specifier) => !specifier)) {
    return undefined
  }

  return `{ ${specifierTexts.join(', ')} }`
}

const getProjectedImportSourceColumn = (node: ImportDeclaration): number | undefined => {
  const specifiersText = getImportSpecifiersText(node)

  if (!specifiersText) {
    return undefined
  }

  const importKeyword = node.importKind === 'type' ? 'import type' : 'import'

  return `${importKeyword} ${specifiersText}${fromClause}`.length
}

const getProjectedExportAllSourceColumn = (node: ExportAllDeclaration): number | undefined => {
  const exportedName = getExportAllExportedName(node)
  const exportKeyword = node.exportKind === 'type' ? 'export type *' : 'export *'
  const exportClause = exportedName ? `${exportKeyword} as ${exportedName}` : exportKeyword

  return `${exportClause}${fromClause}`.length
}

const getProjectedExportNamedSourceColumn = (node: ExportNamedDeclaration): number | undefined => {
  const specifiersText = getExportSpecifiersText(node)

  if (!specifiersText) {
    return undefined
  }

  const exportKeyword = node.exportKind === 'type' ? 'export type' : 'export'

  return `${exportKeyword} ${specifiersText}${fromClause}`.length
}

const getProjectedModuleSourceColumn = (node: ModuleSourceDeclaration): number | undefined => {
  if (node.type === 'ImportDeclaration') {
    return getProjectedImportSourceColumn(node)
  }

  if (node.type === 'ExportAllDeclaration') {
    return getProjectedExportAllSourceColumn(node)
  }

  return getProjectedExportNamedSourceColumn(node)
}

const getModuleSourceColumn = (node: ModuleSourceDeclaration): number => {
  const projectedSourceColumn = getProjectedModuleSourceColumn(node)

  return projectedSourceColumn ?? getFallbackModuleSourceColumn(node)
}

const getProjectedModuleLineLength = (node: ModuleSourceDeclaration): number | undefined => {
  const sourceColumn = getProjectedModuleSourceColumn(node)
  const sourceValue = getSourceValue(node)

  if (sourceColumn === undefined || sourceValue === undefined) {
    return undefined
  }

  return sourceColumn + sourceValue.length + sourceQuoteWidth
}

const isAlignableModuleSourceDeclaration = (
  node: ModuleSourceDeclaration,
  printWidth: number
): boolean => {
  const lineLength = getProjectedModuleLineLength(node)

  return lineLength !== undefined && lineLength <= printWidth
}

const getMaxModuleSourceColumn = (
  nodes: Array<ModuleSourceDeclaration>,
  printWidth: number
): number => {
  const alignableNodes = nodes.filter((node) =>
    isAlignableModuleSourceDeclaration(node, printWidth))

  return alignableNodes.length > 0 ? Math.max(...alignableNodes.map(getModuleSourceColumn)) : 0
}

const setAlignOffset = (
  node: AlignableModuleSourceDeclaration,
  maxModuleSourceColumn: number
): void => {
  const moduleSourceColumn = getModuleSourceColumn(node)

  node.alignOffset =
    moduleSourceColumn < maxModuleSourceColumn ? maxModuleSourceColumn - moduleSourceColumn : 0
}

const setGroupAlignOffsets = (
  nodes: Array<AlignableModuleSourceDeclaration>,
  printWidth: number
): void => {
  const alignableNodes = nodes.filter((node) =>
    isAlignableModuleSourceDeclaration(node, printWidth))
  const maxModuleSourceColumn = getMaxModuleSourceColumn(alignableNodes, printWidth)

  nodes.forEach((node) => {
    node.alignOffset = 0
  })

  alignableNodes.forEach((node) => {
    setAlignOffset(node, maxModuleSourceColumn)
  })
}

const setAlignOffsets = <T extends ModuleSourceDeclaration>(
  body: Array<Node>,
  predicate: (node: Node) => node is T,
  printWidth: number
): void => {
  let group: Array<AlignableModuleSourceDeclaration> = []

  const flushGroup = (): void => {
    setGroupAlignOffsets(group, printWidth)
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
  const printWidth = getPrintWidth(options)

  setAlignOffsets(body, isImportSourceDeclaration, printWidth)
  setAlignOffsets(body, isExportSourceDeclaration, printWidth)

  return ast
}

export const printers: Record<string, Printer> = {
  'typescript-custom': {
    ...estreePrinter,
    preprocess,
    print,
  },
}
