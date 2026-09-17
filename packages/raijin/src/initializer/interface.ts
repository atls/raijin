import type { FetchLike }                  from '../runtime/download.js'
import type { YarnCommandRunner }          from '../yarn/runner.js'
import type { YarnCommandReader }          from '../yarn/runner.js'
import type { YarnPackageQuery }           from '../yarn/runner.js'
import type { RaijinScaffoldTypeSelector } from './scaffold.js'

export interface RunRaijinInitializerOptions {
  argv?: Array<string>
  cwd?: string
  fetchImpl?: FetchLike
  runYarnCommand?: YarnCommandRunner
  queryYarnPackage?: YarnPackageQuery
  readYarnCommand?: YarnCommandReader
  selectScaffoldType?: RaijinScaffoldTypeSelector
}
