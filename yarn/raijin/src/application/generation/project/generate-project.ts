import type { GenerateProjectDependencies } from './generate-project.interfaces.js'
import type { GenerateProjectInput }        from './generate-project.interfaces.js'
import type { ProjectGenerationResult }     from './generate-project.interfaces.js'

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
      artifacts: [],
      diagnostics: [],
      failure: {
        code: 'project-scaffolder-failed',
        message: `Project scaffolder failed unexpectedly: ${getFailureMessage(error)}`,
      },
    }
  }
}
