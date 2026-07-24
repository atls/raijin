import type { TypeScript } from '@atls/code-typescript'

export interface BuildLibraryWorkspaceOptions {
  readonly cwd: string
  readonly target?: string
  readonly typescript?: TypeScript
}
