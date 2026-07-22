import type { GenerateProjectInput }    from '../inputs/generate.js'
import type { ProjectScaffolder }       from '../ports/scaffolder.js'
import type { ProjectGenerationResult } from '../results/generate.js'

interface GenerateProjectDependencies {
  readonly scaffolder: ProjectScaffolder
}

const getFailureMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

export const generateProject = async (
  input: GenerateProjectInput,
  { scaffolder }: GenerateProjectDependencies
): Promise<ProjectGenerationResult> => {
  try {
    return await scaffolder.generate(input)
  } catch (error) {
    return {
      status: 'failed',
      changes: [],
      diagnostics: [],
      failure: {
        code: 'project-scaffold-unexpected-failure',
        message: `Project scaffold failed unexpectedly: ${getFailureMessage(error)}`,
      },
    }
  }
}
