import type { GetPrettierPluginReturn } from '../interfaces/index.js'

import { parsers }                      from '../parsers.js'
import { getPrinters }                  from './printers.getter.js'

export const getPrettierPlugin = async (): GetPrettierPluginReturn => {
  const printers = await getPrinters()

  const plugin = {
    printers,
    parsers,
  }

  return plugin
}
