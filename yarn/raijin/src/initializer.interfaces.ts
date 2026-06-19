import type { FetchLike }         from './runtime-download.interfaces.js'
import type { YarnCommandRunner } from './yarn-command.interfaces.js'

export interface RunRaijinInitializerOptions {
  argv?: Array<string>
  cwd?: string
  fetchImpl?: FetchLike
  runYarnCommand?: YarnCommandRunner
}
