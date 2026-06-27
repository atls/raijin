import { parsers }  from './parsers.js'
import { printers } from './printers/index.js'

const plugin = {
  printers,
  parsers,
}

export default plugin
export * from './getters/index.js'
