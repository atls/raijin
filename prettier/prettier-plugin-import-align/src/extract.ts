/* eslint-disable import/no-mutable-exports */
import { format } from 'prettier'

let printer

format(';', {
  parser(text, { typescript }, options) {
    const plugin: any = options.plugins.find((x: any) => x.printers && x.printers.estree)

    printer = plugin.printers.estree

    return typescript(text)
  },
})

export { printer }
