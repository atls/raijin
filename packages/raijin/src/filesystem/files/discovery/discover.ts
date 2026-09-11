import type { FileDiscovery } from './discover.interfaces.js'

import { discover }           from './adapters/fast-glob/discover.js'

export const discoverFiles: FileDiscovery = discover
