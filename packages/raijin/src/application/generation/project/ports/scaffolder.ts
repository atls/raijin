import type { ProjectScaffoldType }      from '../inputs/generate.js'
import type { ProjectScaffoldingResult } from '../results/generate.js'

export interface ProjectScaffolder {
  scaffold: (scaffoldType: ProjectScaffoldType) => Promise<ProjectScaffoldingResult>
}
