import type { ExportAllDeclaration }   from '@babel/types'
import type { ExportNamedDeclaration } from '@babel/types'
import type { ImportDeclaration }      from '@babel/types'
import type { Node }                   from '@babel/types'
import type { Printer }                from 'prettier'
import type { AST }                    from 'prettier'

import * as estree                     from 'prettier/plugins/estree'

const estreePrinter = (estree as unknown as { printers: Record<string, Printer> }).printers.estree

const fromDocPart = ' from'
const sourceColumnOffset = 6
const namedSpecifiersSourceColumnOffset = 8
const exportAllSourceColumn = 'export * from '.length
const exportTypeAllSourceColumn = 'export type * from '.length

type ModuleSourceDeclaration = ExportAllDeclaration | ExportNamedDeclaration | ImportDeclaration

type AlignableModuleSourceDeclaration = ModuleSourceDeclaration & { alignOffset?: number }

const isSingleLineNode = (node: Node): boolean =>
  Boolean(node.loc && node.loc.end.line === node.loc.start.line)

const isImportSourceDeclaration = (node: Node): node is ImportDeclaration =>
  node.type === 'ImportDeclaration' && node.specifiers.length > 0

const isExportSourceDeclaration = (
  node: Node
): node is ExportAllDeclaration | ExportNamedDeclaration =>
  (node.type === 'ExportAllDeclaration' || node.type === 'ExportNamedDeclaration') &&
  Boolean(node.source)

const isSingleLineImportSourceDeclaration = (node: Node): node is ImportDeclaration =>
  isImportSourceDeclaration(node) && isSingleLineNode(node)

const isSingleLineExportSourceDeclaration = (
  node: Node
): node is ExportAllDeclaration | ExportNamedDeclaration =>
  isExportSourceDeclaration(node) && isSingleLineNode(node)

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

const getModuleSourceColumn = (node: ModuleSourceDeclaration): number => {
  if (node.type === 'ImportDeclaration') {
    return getImportSourceColumn(node)
  }

  if (node.type === 'ExportAllDeclaration') {
    return getExportAllSourceColumn(node)
  }

  return getExportNamedSourceColumn(node)
}

const getMaxModuleSourceColumn = (nodes: Array<ModuleSourceDeclaration>): number =>
  nodes.length > 0 ? Math.max(...nodes.map(getModuleSourceColumn)) : 0

const setAlignOffset = (
  node: AlignableModuleSourceDeclaration,
  maxModuleSourceColumn: number
): void => {
  const moduleSourceColumn = getModuleSourceColumn(node)

  node.alignOffset =
    moduleSourceColumn < maxModuleSourceColumn ? maxModuleSourceColumn - moduleSourceColumn : 0
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

export const preprocess = async (ast: AST): Promise<AST> => {
  const body = ast.body as Array<Node>
  const imports = body.filter(isSingleLineImportSourceDeclaration)
  const exportDeclarations = body.filter(isSingleLineExportSourceDeclaration)

  const maxImportSourceColumn = getMaxModuleSourceColumn(imports)
  const maxExportSourceColumn = getMaxModuleSourceColumn(exportDeclarations)

  body.forEach((node: Node & { alignOffset?: number }) => {
    if (isImportSourceDeclaration(node) && isSingleLineNode(node)) {
      setAlignOffset(node, maxImportSourceColumn)
    }

    if (isExportSourceDeclaration(node) && isSingleLineNode(node)) {
      setAlignOffset(node, maxExportSourceColumn)
    }
  })

  return ast
}

export const printers: Record<string, Printer> = {
  'typescript-custom': {
    ...estreePrinter,
    preprocess,
    print,
  },
}
