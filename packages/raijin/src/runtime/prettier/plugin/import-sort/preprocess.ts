import type { Node }                  from '@babel/types'
import type { ImportDeclaration }     from '@babel/types'
import type { Parser }                from 'prettier'
import type { AST }                   from 'prettier'

import * as typescript                from 'prettier/plugins/typescript'
import { sortImports }                from 'import-sort'

import { ImportSortTypeScriptParser } from './typescript.parser.js'
import { createStyle }                from './style.js'

type RangedImport = ImportDeclaration & { range: [number, number] }

export const getSortableImports = (program: AST, source: string): Array<RangedImport> => {
  const body = program.body as Array<Node>
  const comments = (program.comments ?? []) as Array<{ range?: [number, number] | null }>

  return body.filter((node, index): node is RangedImport => {
    if (
      node.type !== 'ImportDeclaration' ||
      !node.range ||
      node.specifiers.length === 0 ||
      node.attributes?.length ||
      node.assertions?.length ||
      node.module ||
      node.phase ||
      node.importKind === 'typeof' ||
      node.specifiers.some(
        (specifier) =>
          specifier.type === 'ImportSpecifier' && specifier.imported.type !== 'Identifier'
      )
    ) {
      return false
    }

    const previousEnd = body[index - 1]?.range?.[1] ?? 0
    const nextStart = body[index + 1]?.range?.[0] ?? source.length

    return !comments.some(({ range }) => !range || (range[0] < nextStart && range[1] > previousEnd))
  })
}

export const preprocess = (
  source: string,
  { plugins }: Parameters<NonNullable<Parser['preprocess']>>[1],
  workspacePackageNames: ReadonlyArray<string> = []
): string => {
  // @ts-expect-error parser options type is wider at runtime than @types/prettier declares
  const program: AST = typescript.parsers.typescript.parse(source, { plugins })
  const runs: Array<{ end: number; start: number }> = []
  let run: { end: number; start: number } | undefined

  getSortableImports(program, source).forEach((node) => {
    if (!run || source.slice(run.end, node.range[0]).trim() !== '') {
      run = { start: node.range[0], end: node.range[1] }
      runs.push(run)
    } else {
      const [, end] = node.range

      run.end = end
    }
  })

  const style = createStyle(workspacePackageNames)

  return runs.reverse().reduce((result, { start, end }) => {
    const code = source.slice(start, end)
    // @ts-expect-error parser options type is wider at runtime than @types/prettier declares
    const runProgram = typescript.parsers.typescript.parse(code, { plugins })
    const parser = new ImportSortTypeScriptParser(runProgram)
    const { code: sorted } = sortImports(code, parser, style)

    return result.slice(0, start) + sorted.trimEnd() + result.slice(end)
  }, source)
}
