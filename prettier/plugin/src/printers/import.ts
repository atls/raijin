import type { ImportDeclaration }   from '@babel/types'
import type { Node }                from '@babel/types'
import type { Doc }                 from 'prettier'
import type { Options }             from 'prettier'

import type { LocatedComment }      from './source.js'
import type { OriginalTextOptions } from './source.js'

import { hasSourceAlignDoc }        from './source.js'
import { hasCommentToken }          from './source.js'
import { hasComments }              from './source.js'
import { isCommentInsideNode }      from './source.js'
import { registerSourceAlignDoc }   from './source.js'
import { setSourceAlignOffsets }    from './source.js'

type AlignableImportDeclaration = ImportDeclaration & {
  importSourceAlignBlocked?: boolean
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
  node.type === 'ImportDeclaration' && Boolean(node.source)

const hasImportClause = (node: ImportDeclaration): boolean =>
  node.specifiers.length > 0 || hasSourceAlignDoc(node)

const isAlignableImportDeclaration = (
  node: Node,
  originalText: string | undefined
): node is AlignableImportDeclaration =>
  isSourceImportDeclaration(node) &&
  hasImportClause(node) &&
  !hasImportSourceComments(node) &&
  !hasCommentToken(node, originalText) &&
  !hasImportAttributes(node)

export const markImportAlignBlockedComments = (
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

export const registerImportSourceDoc = (node: ImportDeclaration, doc: Doc): void => {
  registerSourceAlignDoc(node, doc)
}

export const setImportAlignOffsets = (body: Array<Node>, options: Options): void => {
  const { originalText } = options as OriginalTextOptions

  setSourceAlignOffsets(body, options, (node) => isAlignableImportDeclaration(node, originalText))
}
