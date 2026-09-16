import type { CommandInput } from '@atls/raijin/commands'

export type FormatProjectInput = {
  readonly cwd: string
  readonly targets?: CommandInput
  readonly write?: boolean
  readonly workspacePackageNames?: ReadonlyArray<string>
}
