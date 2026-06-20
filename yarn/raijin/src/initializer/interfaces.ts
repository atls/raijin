import type { FetchLike }         from '../runtime/download.js'
import type { YarnCommandRunner } from '../yarn/interfaces.js'

export interface RunRaijinInitializerOptions {
  argv?: Array<string>
  cwd?: string
  fetchImpl?: FetchLike
  runYarnCommand?: YarnCommandRunner
}
