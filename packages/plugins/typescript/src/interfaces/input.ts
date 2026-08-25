import type { PortablePath } from '@yarnpkg/fslib'

export type TypecheckManifestPolicySource = {
  readonly cwd: string
  readonly typecheckSkipLibCheck?: unknown
}

export type TypecheckFilesInput = {
  readonly kind: 'files'
  readonly files: ReadonlyArray<PortablePath>
}

export type TypecheckProjectInput = {
  readonly kind: 'project'
  readonly cwd: string
  readonly projectCwd: string
  readonly manifestPolicySources?: ReadonlyArray<TypecheckManifestPolicySource>
}

export type TypecheckInput = TypecheckFilesInput | TypecheckProjectInput
