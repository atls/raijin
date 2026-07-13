import type { FileDiscoveryOptions } from '../../discover.interfaces.js'
import type { Dependencies }         from './discover.interfaces.js'
import type { Invocation }           from './invocation.interfaces.js'

import { normalize }                 from './patterns/normalize.js'

export const createOptions = (
  { cwd, patterns, ignore = [], dot = false }: FileDiscoveryOptions,
  { toNativePath }: Pick<Dependencies, 'toNativePath'>,
  platform: NodeJS.Platform = process.platform
): Invocation => ({
  patterns: patterns.map((pattern) => normalize(pattern, platform)),
  options: {
    cwd: toNativePath(cwd),
    ignore: ignore.map((pattern) => normalize(pattern, platform)),
    dot,
    absolute: true,
    onlyFiles: true,
  },
})
