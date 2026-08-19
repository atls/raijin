import type { CommandInput } from '@atls/raijin/commands'

export interface FormatSourcesOptions {
  readonly cwd: string
  readonly targets?: CommandInput
  readonly workspacePackageNames?: ReadonlyArray<string>
}

export interface FormattedSource {
  readonly file: string
  readonly status: 'changed' | 'unchanged'
}

export interface FormatSourcesResult {
  readonly files: ReadonlyArray<FormattedSource>
}
