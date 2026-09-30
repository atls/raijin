import type { FileDiscovery } from './discover.interfaces.js'

import { discover }           from './glob/discover.js'

export const discoverFiles: FileDiscovery = discover
