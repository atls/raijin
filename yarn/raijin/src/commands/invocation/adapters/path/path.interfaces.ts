import type { PortablePath } from '@yarnpkg/fslib'

export interface PathAdapter {
  toNative: (cwd: PortablePath) => string
  toPortable: (cwd: string) => PortablePath
}
