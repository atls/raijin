import type { PortablePath } from '@yarnpkg/fslib'

export interface TestInputOptions {
  files: Array<string>
  invocationCwd: PortablePath
  target?: string
}
