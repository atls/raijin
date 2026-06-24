/* eslint-disable @typescript-eslint/no-unsafe-call */

import type { ImportDeclaration }             from '@babel/types'
import type { Parser }                        from 'prettier'

import * as babel                             from 'prettier/plugins/babel'
import * as typescript                        from 'prettier/plugins/typescript'
import sortPackageJson                        from 'sort-package-json'

import { preprocess as importSortPreprocess } from './import-sort/index.js'

const preprocess: Parser['preprocess'] = (source, options): string =>
  importSortPreprocess(source, options)

type ImportSpecifier = ImportDeclaration['specifiers'][number]

const isUpperCase = (value: string | undefined): boolean => {
  const firstCharacter = value?.[0]

  return Boolean(firstCharacter && firstCharacter === firstCharacter.toUpperCase())
}

const getImportSpecifierName = (specifier: ImportSpecifier): string | undefined =>
  specifier.local.name

const getImportSpecifierRank = (specifier: ImportSpecifier): number => {
  if (specifier.type === 'ImportNamespaceSpecifier') {
    return 0
  }

  if (specifier.type === 'ImportSpecifier') {
    return isUpperCase(getImportSpecifierName(specifier)) ? 1 : 2
  }

  return isUpperCase(getImportSpecifierName(specifier)) ? 3 : 4
}

const sortSplitImportSpecifiers = (specifiers: Array<ImportSpecifier>): Array<ImportSpecifier> =>
  specifiers
    .map((specifier, index) => ({ index, rank: getImportSpecifierRank(specifier), specifier }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ specifier }) => specifier)

const parse: Parser['parse'] = async (source, { plugins }) => {
  // @ts-expect-error parser options type is wider at runtime than @types/prettier declares
  const program = typescript.parsers.typescript.parse(source, { plugins })

  const bodyLength = program.body.length

  const nodes = [...program.body].reverse()

  nodes.forEach((node, nodeIndex: number) => {
    if (node.type === 'ImportDeclaration') {
      const importNode = node as ImportDeclaration

      if (importNode.specifiers.length > 1) {
        const index = bodyLength - nodeIndex - 1

        program.body.splice(index, 1)

        const splitSpecifiers = sortSplitImportSpecifiers(importNode.specifiers)

        splitSpecifiers.forEach((specifier, specifierIndex: number) => {
          program.body.splice(index + specifierIndex, 0, {
            ...importNode,
            specifiers: [specifier],
          })
        })
      }
    }
  })

  return program // eslint-disable-line @typescript-eslint/no-unsafe-return
}

export const parsers: Record<string, Parser> = {
  typescript: {
    ...typescript.parsers.typescript,
    astFormat: 'typescript-custom',
    preprocess,
    parse,
  },
  'json-stringify': {
    ...babel.parsers['json-stringify'],
    preprocess(text, options) {
      if (babel.parsers['json-stringify'].preprocess) {
        text = babel.parsers['json-stringify'].preprocess(text, options)
      }

      return options.filepath && /(^|\\|\/)package\.json$/.test(options.filepath)
        ? sortPackageJson(text)
        : text
    },
  },
}
