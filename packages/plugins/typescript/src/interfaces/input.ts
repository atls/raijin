export type TypecheckProjectInput = {
  readonly cwd: string
  readonly manifestCwds?: ReadonlyArray<string>
  readonly targets?: ReadonlyArray<string>
}
