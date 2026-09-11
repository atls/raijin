import type { NativePath }   from '@yarnpkg/fslib'
import type { PortablePath } from '@yarnpkg/fslib'

import { npath }             from '@yarnpkg/fslib'

export const toNativePath = (path: PortablePath): string => npath.fromPortablePath(path)

export const toPortablePath = (path: string): PortablePath =>
  npath.toPortablePath(path as NativePath)
