import { format }     from 'prettier/standalone'

import { babel }      from './imports.js'
import { typescript } from './imports.js'

export const extractPrinter = async () => {
  let printer

  await format('const n = 5;', {
    plugins: [
      babel,
      {
        ...typescript,
        parsers: {
          ...typescript.parsers,
          typescript: {
            ...typescript.parsers.typescript,
            parse(text, options) {
              const plugin: any = options.plugins.find((x: any) => x.printers && x.printers.estree)

              printer = plugin.printers.estree

              return typescript.parsers.typescript.parse(text, options)
            },
          },
        },
      },
    ],
    parser: 'typescript',
  })

  return printer
}
