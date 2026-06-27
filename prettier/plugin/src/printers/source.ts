import type { Node }            from '@babel/types'
import type { Doc }             from 'prettier'
import type { Options }         from 'prettier'

import { doc as prettierDoc }   from 'prettier'
import { util as prettierUtil } from 'prettier'

export const fromDocPart = ' from'

const defaultPrintWidth = 80

type RangedNode = {
  end?: number | null
  range?: [number, number] | null
}

type CommentedNode = {
  innerComments?: Array<unknown> | null
  leadingComments?: Array<unknown> | null
  trailingComments?: Array<unknown> | null
}

export type LocatedComment = {
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

export type OriginalTextOptions = Options & {
  originalText?: string
}

type SourceAlignEntry = {
  doc: Doc
  fromPart?: Array<unknown>
  lineWidth?: number
  sourceColumn?: number
}

type DocCommand = {
  break?: boolean | 'propagated'
  breakContents?: Doc
  contents?: Doc
  expandedStates?: Array<Doc>
  flatContents?: Doc
  hard?: boolean
  literal?: boolean
  parts?: Array<Doc>
  soft?: boolean
  type?: string
}

type FlattenResult = {
  foundStop: boolean
  invalid: boolean
  text: string
}

const sourceAlignEntries = new WeakMap<Node, SourceAlignEntry>()

export const getPrintWidth = (options: Options): number => options.printWidth ?? defaultPrintWidth

export const getRangeEnd = (node: RangedNode | null | undefined): number | undefined => {
  if (!node) {
    return undefined
  }

  if (node.range) {
    return node.range[1]
  }

  return typeof node.end === 'number' ? node.end : undefined
}

export const getRangeStart = (node: RangedNode | null | undefined): number | undefined => {
  if (!node) {
    return undefined
  }

  if (node.range) {
    return node.range[0]
  }

  return undefined
}

export const getOriginalNodeText = (
  node: Node | RangedNode,
  originalText: string | undefined
): string | undefined => {
  const start = getRangeStart(node as RangedNode)
  const end = getRangeEnd(node as RangedNode)

  return originalText && start !== undefined && end !== undefined
    ? originalText.slice(start, end)
    : undefined
}

export const hasComments = (node: CommentedNode | null | undefined): boolean =>
  Boolean(
    node &&
      ((node.leadingComments && node.leadingComments.length > 0) ||
        (node.innerComments && node.innerComments.length > 0) ||
        (node.trailingComments && node.trailingComments.length > 0))
  )

export const isCommentInsideNode = (node: Node, comment: LocatedComment): boolean => {
  if (!node.loc || !comment.loc) {
    return false
  }

  const startsOnNodeEndLine =
    comment.loc.start.line === node.loc.end.line && comment.loc.start.column >= node.loc.end.column
  const startsAfterNode =
    comment.loc.start.line > node.loc.start.line ||
    (comment.loc.start.line === node.loc.start.line &&
      comment.loc.start.column >= node.loc.start.column)
  const endsBeforeNode =
    comment.loc.end.line < node.loc.end.line ||
    (comment.loc.end.line === node.loc.end.line && comment.loc.end.column <= node.loc.end.column)

  return (startsAfterNode && endsBeforeNode) || startsOnNodeEndLine
}

const hasCommentSyntax = (text: string): boolean => {
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

export const hasCommentToken = (node: Node, originalText: string | undefined): boolean => {
  const text = getOriginalNodeText(node, originalText)

  if (text && hasCommentSyntax(text)) {
    return true
  }

  if (!node.loc || !originalText) {
    return false
  }

  const line = originalText.split(/\r?\n/u)[node.loc.end.line - 1]
  const sameLineSuffix = line ? line.slice(node.loc.end.column) : ''

  return hasCommentSyntax(sameLineSuffix)
}

const isDocCommand = (doc: unknown): doc is DocCommand =>
  typeof doc === 'object' && doc !== null && !Array.isArray(doc)

const findFromDocPart = (doc: Doc): Array<unknown> | undefined => {
  if (Array.isArray(doc)) {
    if (doc[0] === fromDocPart) {
      return doc as Array<unknown>
    }

    for (const part of doc) {
      const fromPart = findFromDocPart(part)

      if (fromPart) {
        return fromPart
      }
    }

    return undefined
  }

  if (!isDocCommand(doc)) {
    return undefined
  }

  if (doc.contents) {
    const fromPart = findFromDocPart(doc.contents)

    if (fromPart) {
      return fromPart
    }
  }

  if (doc.parts) {
    for (const part of doc.parts) {
      const fromPart = findFromDocPart(part)

      if (fromPart) {
        return fromPart
      }
    }
  }

  if (doc.flatContents) {
    return findFromDocPart(doc.flatContents)
  }

  return undefined
}

const flattenDoc = (doc: Doc, stopPart?: Array<unknown>): FlattenResult => {
  const chunks: Array<string> = []
  let foundStop = false
  let invalid = false

  const visit = (part: Doc): void => {
    if (foundStop || invalid) {
      return
    }

    if (stopPart && part === stopPart) {
      foundStop = true

      return
    }

    if (typeof part === 'string') {
      chunks.push(part)

      return
    }

    if (Array.isArray(part)) {
      part.forEach((item) => {
        visit(item)
      })

      return
    }

    if (!isDocCommand(part)) {
      invalid = true

      return
    }

    switch (part.type) {
      case 'align':
      case 'group':
      case 'indent':
      case 'label':
      case 'line-suffix':
        if (part.type === 'group' && part.break) {
          invalid = true
        } else if (part.contents) {
          visit(part.contents)
        }
        break
      case 'fill':
        part.parts.forEach((item) => {
          visit(item)
        })
        break
      case 'if-break':
        if (part.flatContents) {
          visit(part.flatContents)
        }
        break
      case 'line':
        if (part.hard || part.literal) {
          invalid = true
        } else {
          chunks.push(part.soft ? '' : ' ')
        }
        break
      case 'break-parent':
      case 'cursor':
      case 'line-suffix-boundary':
      case 'trim':
        break
      default:
        invalid = true
    }
  }

  visit(doc)

  return {
    foundStop,
    invalid,
    text: chunks.join(''),
  }
}

const getDocTextWidth = (text: string): number => prettierUtil.getStringWidth(text)

export const registerSourceAlignDoc = (node: Node, doc: Doc): void => {
  const fromPart = findFromDocPart(doc)

  if (!fromPart || prettierDoc.utils.willBreak(doc)) {
    sourceAlignEntries.set(node, { doc })

    return
  }

  const prefix = flattenDoc(doc, fromPart)
  const line = flattenDoc(doc)

  if (prefix.invalid || !prefix.foundStop || line.invalid) {
    sourceAlignEntries.set(node, { doc, fromPart })

    return
  }

  sourceAlignEntries.set(node, {
    doc,
    fromPart,
    lineWidth: getDocTextWidth(line.text),
    sourceColumn: getDocTextWidth(prefix.text),
  })
}

export const hasSourceAlignDoc = (node: Node): boolean =>
  Boolean(sourceAlignEntries.get(node)?.fromPart)

const resetSourceAlignNode = (node: Node): void => {
  const entry = sourceAlignEntries.get(node)

  if (entry?.fromPart) {
    entry.fromPart[0] = fromDocPart
  }
}

const setSourceAlignNodeOffset = (node: Node, alignOffset: number): void => {
  const entry = sourceAlignEntries.get(node)

  if (entry?.fromPart) {
    entry.fromPart[0] =
      alignOffset > 0 ? `${''.padStart(alignOffset, ' ')}${fromDocPart}` : fromDocPart
  }
}

const isMeasuredSourceAlignEntry = (
  entry: SourceAlignEntry | undefined
): entry is Required<SourceAlignEntry> => {
  if (!entry?.fromPart) {
    return false
  }

  return typeof entry.sourceColumn === 'number' && typeof entry.lineWidth === 'number'
}

const getMaxSourceColumn = (nodes: Array<Node>): number =>
  nodes.length > 0
    ? Math.max(
        ...nodes.map(
          (node) => sourceAlignEntries.get(node)?.sourceColumn ?? Number.NEGATIVE_INFINITY
        )
      )
    : 0

const getAlignableSourceNodes = (
  nodes: Array<Node>,
  options: Options,
  isAlignable: (node: Node) => boolean
): Array<Node> => {
  const printWidth = getPrintWidth(options)
  let alignableNodes = nodes.filter((node) => {
    const entry = sourceAlignEntries.get(node)

    return isAlignable(node) && isMeasuredSourceAlignEntry(entry) && entry.lineWidth <= printWidth
  })

  while (alignableNodes.length > 0) {
    const maxSourceColumn = getMaxSourceColumn(alignableNodes)
    const nextAlignableNodes = alignableNodes.filter((node) => {
      const entry = sourceAlignEntries.get(node)

      return (
        isMeasuredSourceAlignEntry(entry) &&
        entry.lineWidth + maxSourceColumn - entry.sourceColumn <= printWidth
      )
    })

    if (nextAlignableNodes.length === alignableNodes.length) {
      return alignableNodes
    }

    alignableNodes = nextAlignableNodes
  }

  return alignableNodes
}

export const setSourceAlignOffsets = (
  nodes: Array<Node>,
  options: Options,
  isAlignable: (node: Node) => boolean
): void => {
  nodes.forEach((node) => {
    resetSourceAlignNode(node)
  })

  const alignableNodes = getAlignableSourceNodes(nodes, options, isAlignable)
  const maxSourceColumn = getMaxSourceColumn(alignableNodes)

  alignableNodes.forEach((node) => {
    const sourceColumn = sourceAlignEntries.get(node)?.sourceColumn ?? maxSourceColumn

    setSourceAlignNodeOffset(
      node,
      sourceColumn < maxSourceColumn ? maxSourceColumn - sourceColumn : 0
    )
  })
}
