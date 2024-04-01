import sortImports                      from 'import-sort'
import sortPackageJson                  from 'sort-package-json'
import { ParserOptions }                from 'prettier'
import { parsers as babelParsers }      from 'prettier/plugins/babel'
import { parsers as typescriptParsers } from 'prettier/plugins/typescript'

import { ImportSortParser }             from './import-sort'
import { style }                        from './import-sort'

type Preprocess = (sources: string, options: ParserOptions) => string

const preprocess: Preprocess = (source, options) => {
  const { code } = sortImports(
    source,
    new ImportSortParser(typescriptParsers.typescript.parse(source, options)),
    style
  )

  return code
}

type Parse = (sources: string, options: ParserOptions<any>) => Promise<string>

const parse: Parse = (source, options) => {
  const program = typescriptParsers.typescript.parse(source, options)

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
    preprocess(text: string, options: ParserOptions) {
      const regex = /package.*json$/u

      let source = text

      if (babelParsers['json-stringify'].preprocess) {
        source = babelParsers['json-stringify'].preprocess(text, options)
      }

      return options.filepath && regex.test(options.filepath) ? sortPackageJson(source) : source
    },
  },
}
