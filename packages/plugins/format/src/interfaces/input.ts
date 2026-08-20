import type { CommandInput } from '@atls/raijin/commands'

export interface FormatCommandOptions {
  readonly cwd: string
  readonly targets: CommandInput
  readonly workspacePackageNames: ReadonlyArray<string>
}

export interface FormatSourcesOptions {
  readonly cwd: string
  readonly targets?: CommandInput
  readonly workspacePackageNames?: ReadonlyArray<string>
}
