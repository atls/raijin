import type { PortablePath } from '@yarnpkg/fslib'

export type CommandInputSource = 'changed' | 'explicit' | 'generated'

export interface CommandTarget {
  readonly path: PortablePath
  readonly request: string
}

export interface CommandInput {
  readonly cwd: PortablePath
  readonly source: CommandInputSource
  readonly targets: ReadonlyArray<CommandTarget>
}

export interface CommandInputOptions {
  cwd: PortablePath
  source: CommandInputSource
  targets?: ReadonlyArray<string>
}
