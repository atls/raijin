import type { PortablePath } from '@yarnpkg/fslib'

export interface SyncTypeScriptConfigOptions {
  readonly cwd: PortablePath
  readonly workspacePatterns: ReadonlyArray<string>
}
