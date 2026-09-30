export type TypecheckManifestPolicySource = {
  readonly cwd: string
  readonly typecheckSkipLibCheck?: unknown
}

type TypecheckProjectFields = {
  readonly cwd: string
  readonly projectCwd: string
  readonly manifestPolicySources?: ReadonlyArray<TypecheckManifestPolicySource>
}

export type TypecheckFilesInput = TypecheckProjectFields & {
  readonly kind: 'files'
  readonly files: ReadonlyArray<string>
}

export type TypecheckProjectInput = TypecheckProjectFields & {
  readonly kind: 'project'
}

export type TypecheckInput = TypecheckFilesInput | TypecheckProjectInput
