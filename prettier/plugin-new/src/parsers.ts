import sortImports                      from 'import-sort'
import { Options }                      from 'prettier'
import { Plugin as PrettierPlugin }     from 'prettier'
import sortPackageJson                  from 'sort-package-json'
import { parsers as babelParsers }      from 'prettier/plugins/babel'
import { parsers as typescriptParsers } from 'prettier/plugins/typescript'

import { ImportSortParser }             from './import-sort'
import { style }                        from './import-sort'

const preprocess = (source, { plugins }) => {
  const plugin = plugins.find((p) => p.parsers?.typescript)

  const { code } = sortImports(
    source,
    new ImportSortParser(plugin.parsers.typescript.parse(source)),
    style
  )

  return code
}

type Parse = (sources: string, _: any, options: Options) => string

const parse: Parse = (source, _, { plugins }) => {
  const plugin = plugins?.find((p ) => {
    if (typeof p === 'object') return p.parsers?.typescript

    return undefined
  }) as PrettierPlugin

  // @ts-ignore
  const program = plugin?.parsers?.typescript.parse(source)

  const bodyLength = program.body.length

  const nodes = [...program.body].reverse()

  nodes.forEach((node, nodeIndex) => {
    if (node.type === 'ImportDeclaration') {
      if (node.specifiers.length > 1) {
        const index = bodyLength - nodeIndex - 1

        program.body.splice(index, 1)

        node.specifiers.forEach((__, specifierIndex) => {
          program.body.splice(index + specifierIndex, 0, {
            ...node,
            specifiers: node.specifiers.filter((___, i) => specifierIndex === i),
          })
        })
      }
    }
  })

  return program
}

export const parsers = {
  typescript: {
    ...typescriptParsers.typescript,
    astFormat: 'typescript-custom',
    preprocess,
    parse,
  },
  'json-stringify': {
    ...babelParsers['json-stringify'],
    preprocess(text, options) {
      if (babelParsers['json-stringify'].preprocess) {
        // eslint-disable-next-line no-param-reassign
        text = babelParsers['json-stringify'].preprocess(text, options)
      }

      return options.filepath && /(^|\\|\/)package\.json$/.test(options.filepath)
        ? sortPackageJson(text)
        : text
    },
  },
}
