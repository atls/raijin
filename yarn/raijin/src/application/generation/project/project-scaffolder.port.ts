import type { GenerateProjectInput }    from './generate-project.interfaces.js'
import type { ProjectGenerationResult } from './generate-project.interfaces.js'

export interface ProjectScaffolder {
  readonly generate: (input: GenerateProjectInput) => Promise<ProjectGenerationResult>
}
