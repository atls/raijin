import type { PortablePath } from '@yarnpkg/fslib'

export interface PathAdapter {
  toNative: (path: PortablePath) => string
  toPortable: (path: string) => PortablePath
}
