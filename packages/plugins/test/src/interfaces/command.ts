import type { PortablePath } from '@yarnpkg/fslib'

export type CommandInputOptions = {
  files: Array<string>
  invocationCwd: PortablePath
  target?: string
}
