import type { EnvironmentPatch } from '../../../../application/execution/index.js'

export interface EnvironmentInput {
  binDirectory: string
  cwd: string
  patch: EnvironmentPatch
}

export interface Environment {
  prepare: (input: EnvironmentInput) => Promise<NodeJS.ProcessEnv>
}
