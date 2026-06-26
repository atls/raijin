import type { Node }    from '@babel/types'
import type { Options } from 'prettier'

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

type StringLiteralNode = {
  raw?: string
  value?: unknown
}

type NamedNode = {
  name?: string
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

const printDoubleQuotedString = (value: string): string => JSON.stringify(value)

const printSingleQuotedString = (value: string): string => {
  const doubleQuoted = printDoubleQuotedString(value)
  const body = doubleQuoted.slice(1, -1).replace(/\\"/gu, '"').replace(/'/gu, "\\'")

  return `'${body}'`
}

export const printStringLiteral = (value: string, options: Options): string => {
  const doubleQuoted = printDoubleQuotedString(value)
  const singleQuoted = printSingleQuotedString(value)

  if (options.singleQuote) {
    return singleQuoted.length <= doubleQuoted.length ? singleQuoted : doubleQuoted
  }

  return doubleQuoted.length <= singleQuoted.length ? doubleQuoted : singleQuoted
}

export const printModuleName = (node: unknown, options: Options): string => {
  const named = node as NamedNode

  if (typeof named.name === 'string') {
    return named.name
  }

  const literal = node as StringLiteralNode

  if (typeof literal.value === 'string') {
    return printStringLiteral(literal.value, options)
  }

  return typeof literal.raw === 'string' ? literal.raw : ''
}

export const getSourceLiteralLength = (
  source: StringLiteralNode | null | undefined,
  options: Options
): number => {
  if (source && typeof source.value === 'string') {
    return printStringLiteral(source.value, options).length
  }

  if (typeof source?.raw === 'string') {
    return source.raw.length
  }

  return 0
}

export const getStatementTerminatorLength = (options: Options): number =>
  options.semi === false ? 0 : 1

export const getSourceLineLength = (
  sourceColumn: number,
  source: StringLiteralNode | null | undefined,
  options: Options
): number =>
  sourceColumn + getSourceLiteralLength(source, options) + getStatementTerminatorLength(options)

export const alignFromDocPart = (part: unknown, alignOffset: number | undefined): unknown => {
  if (Array.isArray(part) && part[0] === fromDocPart && alignOffset && alignOffset > 0) {
    part[0] = `${''.padStart(alignOffset, ' ')}${fromDocPart}`
  }

  return part
}
