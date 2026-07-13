import type { PortablePath } from '@yarnpkg/fslib'

export interface FileDiscoveryOptions {
  readonly cwd: PortablePath
  readonly patterns: ReadonlyArray<string>
  readonly ignore?: ReadonlyArray<string>
  readonly dot?: boolean
}
