import type { FileDiscovery } from './discover.interfaces.js'

import { toNativePath }       from '../paths/convert.js'
import { toPortablePath }     from '../paths/convert.js'
import { createDiscovery }    from './adapters/globby/discover.js'

export const discoverFiles: FileDiscovery = createDiscovery({
  toNativePath,
  toPortablePath,
})
