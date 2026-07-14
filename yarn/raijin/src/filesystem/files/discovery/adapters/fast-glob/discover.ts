import type { NativePath }    from '@yarnpkg/fslib'

import type { FileDiscovery } from '../../discover.interfaces.js'

import { npath }              from '@yarnpkg/fslib'
import fastGlob               from 'fast-glob'

import { translatePatterns }  from './patterns.js'

export const discover: FileDiscovery = async (input) => {
  const files = await fastGlob(translatePatterns(input.patterns), {
    cwd: npath.fromPortablePath(input.cwd),
    ignore: translatePatterns(input.ignore ?? []),
    absolute: true,
    onlyFiles: true,
    dot: input.dot ?? false,
  })

  return Array.from(new Set(files.map((file) => npath.toPortablePath(file as NativePath)))).sort()
}
