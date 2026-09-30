import type { ProjectScaffoldType }      from './input.js'
import type { ProjectScaffoldingResult } from './result.js'

export interface ProjectScaffolder {
  scaffold: (scaffoldType: ProjectScaffoldType) => Promise<ProjectScaffoldingResult>
}
