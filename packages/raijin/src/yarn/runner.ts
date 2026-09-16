export type YarnCommandRunner = (
  args: Array<string>,
  cwd: string,
  options?: { skipInstallHooks?: boolean }
) => Promise<void>

export interface YarnPackageMetadata {
  name: string
  version: string
  gitHead: string
  dist: { integrity: string }
}

export type YarnPackageQuery = (
  name: string,
  version: string,
  cwd: string
) => Promise<YarnPackageMetadata>

export type YarnCommandReader = (args: Array<string>, cwd: string) => Promise<string>
