import type { GenerateProjectInput }    from '../inputs/generate.js'
import type { ProjectGenerationResult } from '../results/generate.js'

export interface ProjectScaffolder {
  readonly generate: (input: GenerateProjectInput) => Promise<ProjectGenerationResult>
}
