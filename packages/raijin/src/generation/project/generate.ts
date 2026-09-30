import type { GenerateProjectInput }  from './interfaces/input.js'
import type { GenerateProjectResult } from './interfaces/result.js'
import type { ProjectScaffolder }     from './interfaces/scaffolder.js'

import { isProjectScaffoldType }      from './interfaces/input.js'
import { projectScaffoldTypes }       from './interfaces/input.js'

export const generateProject = async (
  { scaffoldType }: GenerateProjectInput,
  { scaffolder }: { scaffolder: ProjectScaffolder }
): Promise<GenerateProjectResult> => {
  if (!isProjectScaffoldType(scaffoldType)) {
    return {
      status: 'rejected',
      failure: {
        code: 'unsupported-project-scaffold-type',
        message: `Unsupported project scaffold type "${scaffoldType}". Expected one of: ${projectScaffoldTypes.join(', ')}.`,
      },
    }
  }

  return scaffolder.scaffold(scaffoldType)
}
