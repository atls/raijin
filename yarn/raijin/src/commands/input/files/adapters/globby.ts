import type { GlobbyFileDiscoveryOptions } from './globby.interfaces.js'

import { globby }                          from 'globby'

export const discoverFilesWithGlobby = async ({
  cwd,
  patterns,
  ignore = [],
  dot = false,
}: GlobbyFileDiscoveryOptions): Promise<Array<string>> =>
  globby([...patterns], {
    cwd,
    ignore: [...ignore],
    dot,
    absolute: true,
    onlyFiles: true,
  })
