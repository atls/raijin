import type { GetPrettierPluginReturn }  from '../interfaces/index.js'
import type { GetPrettierPluginOptions } from '../interfaces/index.js'

import { createParsers }                 from '../parsers.js'
import { getPrinters }                   from './printers.getter.js'

export const getPrettierPlugin = async (
  options: GetPrettierPluginOptions = {}
): GetPrettierPluginReturn => {
  const printers = await getPrinters()

  const plugin = {
    printers,
    parsers: createParsers(options.workspacePackageNames),
  }

  return plugin
}
