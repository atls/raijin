import * as babel      from 'prettier/plugins/babel'
import * as estree     from 'prettier/plugins/estree'
import * as typescript from 'prettier/plugins/typescript'
import { format }      from 'prettier/standalone'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const extractPrinter = async (): Promise<any> => {
  let printer

  await format('const n = 5;', {
    plugins: [
      // @ts-expect-error is not assignable
      estree,
      babel,
      {
        ...typescript,
        parsers: {
          ...typescript.parsers,
          typescript: {
            ...typescript.parsers.typescript,
            parse(text, options) {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const plugin: any = options.plugins.find((x: any) => x.printers?.estree)

              printer = plugin.printers.estree

              // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
