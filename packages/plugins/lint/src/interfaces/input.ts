export type LintProjectInput = {
  readonly rootCwd: string
  readonly cwd: string
  readonly targets?: ReadonlyArray<string>
  readonly fix?: boolean
  readonly cache?: boolean
}
