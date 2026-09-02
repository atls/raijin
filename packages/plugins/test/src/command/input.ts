import type { PortablePath } from '@yarnpkg/fslib'

export type Input = {
  files: Array<string>
  invocationCwd: PortablePath
  target?: string
}
