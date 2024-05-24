import sortImportsPkg       from 'import-sort'
import sortPackageJson      from 'sort-package-json'

import { ImportSortParser } from './import-sort/index.js'
import { style }            from './import-sort/index.js'
import { babel }            from './imports.js'
import { typescript }       from './imports.js'

// TODO: moduleResolution
const sortImports = sortImportsPkg as any

const preprocess = (source, { plugins }) => {
  const plugin = plugins.find((p) => p.parsers?.typescript)

  const { code } = sortImports(
    source,
    new ImportSortParser(plugin.parsers.typescript.parse(source)),
    style
  )

  return code
}

const parse = async (source, { plugins }) => {
  const plugin = plugins.find((p) => p.parsers?.typescript)

  const program = plugin.parsers.typescript.parse(source)

  const bodyLength = program.body.length

  const nodes = [...program.body].reverse()

  nodes.forEach((node, nodeIndex) => {
    if (node.type === 'ImportDeclaration') {
      if (node.specifiers.length > 1) {
        const index = bodyLength - nodeIndex - 1

        program.body.splice(index, 1)

        node.specifiers.forEach((_, specifierIndex) => {
          program.body.splice(index + specifierIndex, 0, {
            ...node,
            // eslint-disable-next-line no-shadow
            specifiers: node.specifiers.filter((_, i) => specifierIndex === i),
          })
        })
      }
    }
  })

  return program
}

export const parsers = {
  typescript: {
    ...typescript.parsers!.typescript,
    astFormat: 'typescript-custom',
    preprocess,
    parse,
  },
  'json-stringify': {
    ...babel.parsers['json-stringify'],
    preprocess(text, options) {
      if (babel.parsers['json-stringify'].preprocess) {
        // eslint-disable-next-line no-param-reassign
        text = babel.parsers['json-stringify'].preprocess(text, options)
      }

      return options.filepath && /(^|\\|\/)package\.json$/.test(options.filepath)
        ? sortPackageJson(text)
        : text
    },
  },
}
