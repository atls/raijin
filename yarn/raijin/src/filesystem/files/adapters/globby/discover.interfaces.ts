import type { PortablePath } from '@yarnpkg/fslib'

export interface Dependencies {
  readonly toNativePath: (path: PortablePath) => string
  readonly toPortablePath: (path: string) => PortablePath
}
