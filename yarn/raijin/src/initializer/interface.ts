import type { FetchLike }                  from '../runtime/download.js'
import type { YarnCommandRunner }          from '../yarn/runner.js'
import type { RaijinScaffoldTypeSelector } from './scaffold.js'
import type { RaijinSchematicInstaller }   from './schematic.js'

export interface RunRaijinInitializerOptions {
  argv?: Array<string>
  cwd?: string
  fetchImpl?: FetchLike
  installSchematicArtifact?: RaijinSchematicInstaller
  runYarnCommand?: YarnCommandRunner
  selectScaffoldType?: RaijinScaffoldTypeSelector
}
