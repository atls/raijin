import type { ArtifactInstaller }          from '../commands/generate/index.js'
import type { FetchLike }                  from '../runtime/download.js'
import type { YarnCommandRunner }          from '../yarn/runner.js'
import type { RaijinScaffoldTypeSelector } from './scaffold.js'

export interface RunRaijinInitializerOptions {
  argv?: Array<string>
  cwd?: string
  fetchImpl?: FetchLike
  installSchematicArtifact?: ArtifactInstaller
  runYarnCommand?: YarnCommandRunner
  selectScaffoldType?: RaijinScaffoldTypeSelector
}
