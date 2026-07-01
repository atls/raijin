import type { ExportAllDeclaration }   from '@babel/types'
import type { ExportNamedDeclaration } from '@babel/types'
import type { Node }                   from '@babel/types'
import type { Doc }                    from 'prettier'
import type { Options }                from 'prettier'
import type { AST }                    from 'prettier'

import type { LocatedComment }         from './source.js'
import type { OriginalTextOptions }    from './source.js'

import { getRangeEnd }                 from './source.js'
import { hasCommentToken }             from './source.js'
import { hasComments }                 from './source.js'
import { isCommentInsideNode }         from './source.js'
import { registerSourceAlignDoc }      from './source.js'
import { setSourceAlignOffsets }       from './source.js'

const unsupportedImportAssertionPattern = /^\s*assert\s*\{/u

type SourceExportDeclaration = ExportAllDeclaration | ExportNamedDeclaration

type AlignableExportDeclaration = SourceExportDeclaration & {
  exportSourceAlignBlocked?: boolean
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

export const markExportAlignBlockedComments = (
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

const isExportAlignGroupMember = (
  node: Node,
  originalText: string | undefined
): node is AlignableExportDeclaration =>
  isSourceExportDeclaration(node) &&
  !hasExportSourceComments(node) &&
  !hasCommentToken(node, originalText) &&
  !hasImportAttributes(node) &&
  !hasUnsupportedImportAssertion(node, originalText)

const setExportGroupAlignOffsets = (
  nodes: Array<AlignableExportDeclaration>,
  options: Options,
  originalText: string | undefined
): void => {
  setSourceAlignOffsets(nodes, options, (node) => isExportAlignGroupMember(node, originalText))
}

const setExportAlignOffsets = (
  body: Array<Node>,
  options: Options,
  originalText: string | undefined
): void => {
  let group: Array<AlignableExportDeclaration> = []

  const flushGroup = (): void => {
    setExportGroupAlignOffsets(group, options, originalText)
    group = []
  }

  body.forEach((node) => {
    if (isExportAlignGroupMember(node, originalText)) {
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
  const { originalText } = options as OriginalTextOptions

  setExportAlignOffsets(body, options, originalText)
}

export const registerExportSourceDoc = (node: SourceExportDeclaration, doc: Doc): void => {
  registerSourceAlignDoc(node, doc)
}
