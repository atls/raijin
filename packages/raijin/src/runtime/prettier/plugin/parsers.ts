/* eslint-disable @typescript-eslint/no-unsafe-call */

import type { ImportDeclaration }             from '@babel/types'
import type { Parser }                        from 'prettier'

import * as babel                             from 'prettier/plugins/babel'
import * as typescript                        from 'prettier/plugins/typescript'
import sortPackageJson                        from 'sort-package-json'

import { preprocess as importSortPreprocess } from './import-sort/index.js'
import { getSortableImports }                 from './import-sort/preprocess.js'

const parse: Parser['parse'] = async (source, { plugins }) => {
  // @ts-expect-error parser options type is wider at runtime than @types/prettier declares
  const program = typescript.parsers.typescript.parse(source, { plugins })
  const sortableImportStarts = new Set(
    getSortableImports(program, source).map((imported) => imported.range[0])
  )

  const bodyLength = program.body.length

  const nodes = [...program.body].reverse()

  nodes.forEach((node, nodeIndex: number) => {
    if (node.type === 'ImportDeclaration') {
      const declaration = node as ImportDeclaration

      if (declaration.specifiers.length > 1) {
        const importStart = declaration.range?.[0]
        if (importStart === undefined || !sortableImportStarts.has(importStart)) {
          return
        }

        const index = bodyLength - nodeIndex - 1
        const nonDefaults = declaration.specifiers.filter(
          (specifier) => specifier.type !== 'ImportDefaultSpecifier'
        )
        const defaults = declaration.specifiers.filter(
          (specifier) => specifier.type === 'ImportDefaultSpecifier'
        )
        const specifiers =
          nonDefaults.length > 0 && defaults.length > 0
            ? [...nonDefaults, ...defaults]
            : declaration.specifiers

        program.body.splice(index, 1)

        specifiers.forEach((specifier, specifierIndex) => {
          program.body.splice(index + specifierIndex, 0, {
            ...declaration,
            range:
              specifierIndex === specifiers.length - 1
                ? declaration.range
                : [declaration.range![0], specifier.range![1]],
            specifiers: [specifier],
          })
        })
      }
    }
  })

  return program // eslint-disable-line @typescript-eslint/no-unsafe-return
}

export const createParsers = (
  workspacePackageNames: ReadonlyArray<string> = []
): Record<string, Parser> => ({
  typescript: {
    ...typescript.parsers.typescript,
    astFormat: 'typescript-custom',
    preprocess: (source, options): string =>
      importSortPreprocess(source, options, workspacePackageNames),
    parse,
  },
  'json-stringify': {
    ...babel.parsers['json-stringify'],
    async preprocess(text, options) {
      if (babel.parsers['json-stringify'].preprocess) {
        text = await babel.parsers['json-stringify'].preprocess(text, options)
      }

      return options.filepath && /(^|\\|\/)package\.json$/.test(options.filepath)
        ? sortPackageJson(text)
        : text
    },
  },
})
