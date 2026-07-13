import type { FileDiscovery } from '../../discover.interfaces.js'
import type { Dependencies }  from './discover.interfaces.js'

import { globby }             from 'globby'

import { createOptions }      from './options.js'

export const createDiscovery = (dependencies: Dependencies): FileDiscovery =>
  async (input) => {
    const { patterns, options } = createOptions(input, dependencies)
    const files = await globby(patterns, options)

    return Array.from(new Set(files.map((file) => dependencies.toPortablePath(file)))).sort()
  }
