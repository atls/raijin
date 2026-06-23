import type { FetchLike }                  from '../runtime/download.js'
import type { YarnCommandRunner }          from '../yarn/runner.js'
import type { RaijinScaffoldTypeSelector } from './scaffold.js'

export interface RunRaijinInitializerOptions {
  argv?: Array<string>
  cwd?: string
  fetchImpl?: FetchLike
  runYarnCommand?: YarnCommandRunner
  selectScaffoldType?: RaijinScaffoldTypeSelector
}
