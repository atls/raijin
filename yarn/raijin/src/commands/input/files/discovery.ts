import type { PortablePath }         from '@yarnpkg/fslib'

import type { FileDiscoveryOptions } from './discovery.interfaces.js'

import { npath }                     from '@yarnpkg/fslib'

import { toNativeCwd }               from '../../invocation/index.js'
import { selectGlobPatternAdapter }  from './adapters/glob-pattern/index.js'
import { discoverFilesWithGlobby }   from './adapters/globby.js'

export const discoverFiles = async (
  options: FileDiscoveryOptions
): Promise<Array<PortablePath>> => {
  const patternAdapter = selectGlobPatternAdapter()
  const files = await discoverFilesWithGlobby({
    ...options,
    cwd: toNativeCwd(options.cwd),
    patterns: options.patterns.map(patternAdapter.toGlobby),
    ignore: options.ignore?.map(patternAdapter.toGlobby),
  })

  return Array.from(new Set(files.map((file) => npath.toPortablePath(file)))).sort()
}
