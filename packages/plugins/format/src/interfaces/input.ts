import type { CommandInput } from '@atls/raijin/commands'

export type FormatProjectInput = {
  readonly cwd: string
  readonly targets?: CommandInput
  readonly workspacePackageNames?: ReadonlyArray<string>
}
