import type { PortablePath }         from '@yarnpkg/fslib'

import type { FileDiscoveryOptions } from './discovery.interfaces.js'

import { npath }                     from '@yarnpkg/fslib'

import { toNativeCwd }               from '../../invocation/adapters/path/index.js'
import { discoverFilesWithGlobby }   from './adapters/globby.js'

export const discoverFiles = async (
  options: FileDiscoveryOptions
): Promise<Array<PortablePath>> => {
  const files = await discoverFilesWithGlobby({
    ...options,
    cwd: toNativeCwd(options.cwd),
  })

  return Array.from(new Set(files.map((file) => npath.toPortablePath(file)))).sort()
}
