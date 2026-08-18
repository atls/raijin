import type { CommandInput }        from '@atls/raijin/commands'
import type { FormatSourcesResult } from '@atls/raijin/project/formatting'

export interface FormatCommandOptions {
  readonly cwd: string
  readonly targets: CommandInput
  readonly workspacePackageNames: ReadonlyArray<string>
}

export type FormatCommandResult =
  | { readonly error: unknown; readonly status: 'failed' }
  | { readonly result: FormatSourcesResult; readonly status: 'succeeded' }
