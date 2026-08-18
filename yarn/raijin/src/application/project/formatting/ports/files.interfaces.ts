import type { CommandInput } from '../../../../commands/index.js'

export interface SourceTarget {
  readonly file: string
  readonly path: string
}

export interface SourceFiles {
  readonly read: (path: string) => Promise<string>
  readonly resolve: (input?: CommandInput) => Promise<ReadonlyArray<SourceTarget>>
  readonly write: (path: string, content: string) => Promise<void>
}
