import type { Node }              from '@babel/types'
import type { ImportDeclaration } from '@babel/types'
import type { Parser }            from 'prettier'
import type { AST }               from 'prettier'

import parser                     from '@typescript-eslint/parser'
import * as typescript            from 'prettier/plugins/typescript'
import { Linter }                 from 'eslint'
import perfectionist              from 'eslint-plugin-perfectionist'

type RangedImport = ImportDeclaration & { range: [number, number] }
type ImportRun = { end: number; imports: Array<RangedImport>; start: number }
type ImportBucket = { imports: Array<string>; rank: number; section: number }

const SECTION = {
  typeAbsolute: 0,
  typeRelative: 1,
  node: 2,
  external: 3,
  workspace: 4,
  relative: 5,
} as const

const MEMBER = {
  namespace: 0,
  namedUpper: 1,
  namedLower: 2,
  defaultUpper: 3,
  defaultLower: 4,
} as const

const UNSCOPED_EXTERNAL_OFFSET = 5

const sorter = new Linter()
const sorterConfig: Array<Linter.Config> = [
  {
    files: ['**/*.ts'],
    languageOptions: { parser, sourceType: 'module' },
    plugins: { perfectionist },
    rules: {
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
          sortBy: 'path',
          groups: ['import'],
          newlinesBetween: 0,
          sortSideEffects: false,
        },
      ],
    },
  },
]

const getBucket = (
  node: RangedImport,
  workspacePackageNames: ReadonlyArray<string>
): Pick<ImportBucket, 'rank' | 'section'> => {
  const moduleName = node.source.value
  const relative = moduleName.startsWith('.')
  const workspace = workspacePackageNames.some(
    (name) => moduleName === name || moduleName.startsWith(`${name}/`)
  )
  const namespace = node.specifiers.some(
    (specifier) => specifier.type === 'ImportNamespaceSpecifier'
  )
  const defaultSpecifier = node.specifiers.find(
    (specifier) => specifier.type === 'ImportDefaultSpecifier'
  )
  const namedSpecifier = node.specifiers.find((specifier) => specifier.type === 'ImportSpecifier')
  const localName = defaultSpecifier?.local.name ?? namedSpecifier?.local.name ?? ''
  let memberRank: number

  if (namespace) {
    memberRank = MEMBER.namespace
  } else if (defaultSpecifier) {
    memberRank = /^[A-Z]/u.test(localName) ? MEMBER.defaultUpper : MEMBER.defaultLower
  } else {
    memberRank = /^[A-Z]/u.test(localName) ? MEMBER.namedUpper : MEMBER.namedLower
  }

  if (node.importKind === 'type') {
    return { section: relative ? SECTION.typeRelative : SECTION.typeAbsolute, rank: memberRank }
  }

  if (moduleName.startsWith('node:')) return { section: SECTION.node, rank: 0 }
  if (workspace) return { section: SECTION.workspace, rank: memberRank }
  if (relative) return { section: SECTION.relative, rank: memberRank }

  return {
    section: SECTION.external,
    rank: (moduleName.startsWith('@') ? 0 : UNSCOPED_EXTERNAL_OFFSET) + memberRank,
  }
}

const sortRun = (
  source: string,
  run: ImportRun,
  workspacePackageNames: ReadonlyArray<string>
): string => {
  const buckets = new Map<string, ImportBucket>()

  for (const imported of run.imports) {
    const { section, rank } = getBucket(imported, workspacePackageNames)
    const key = `${section}:${rank}`
    const bucket = buckets.get(key) ?? { section, rank, imports: [] }

    bucket.imports.push(source.slice(imported.range[0], imported.range[1]))
    buckets.set(key, bucket)
  }

  const orderedBuckets = [...buckets.values()].sort(
    (left, right) => left.section - right.section || left.rank - right.rank
  )
  let result = ''
  let previous: ImportBucket | undefined

  for (const bucket of orderedBuckets) {
    const sorted = sorter.verifyAndFix(bucket.imports.join('\n'), sorterConfig, {
      filename: 'run.ts',
    })

    if (sorted.messages.length > 0) {
      throw new Error(sorted.messages.map(({ message }) => message).join('\n'))
    }

    if (previous) result += previous.section === bucket.section ? '\n' : '\n\n'
    result += sorted.output.trimEnd()
    previous = bucket
  }

  return result
}

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
  const runs: Array<ImportRun> = []
  let run: ImportRun | undefined

  getSortableImports(program, source).forEach((node) => {
    if (!run || source.slice(run.end, node.range[0]).trim() !== '') {
      run = { start: node.range[0], end: node.range[1], imports: [node] }
      runs.push(run)
    } else {
      const [, end] = node.range

      run.end = end
      run.imports.push(node)
    }
  })

  return runs.reverse().reduce((result, current) => {
    const sorted = sortRun(source, current, workspacePackageNames)

    return result.slice(0, current.start) + sorted + result.slice(current.end)
  }, source)
}
