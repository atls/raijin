export interface YarnCommandOptions {
  followYarnPath?: boolean
  packageManager?: string
  skipInstallHooks?: boolean
}

export type YarnCommandRunner = (
  args: Array<string>,
  cwd: string,
  options?: YarnCommandOptions
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
  cwd: string,
  packageManager: string
) => Promise<YarnPackageMetadata>

export type YarnCommandReader = (
  args: Array<string>,
  cwd: string,
  options?: YarnCommandOptions
) => Promise<string>
