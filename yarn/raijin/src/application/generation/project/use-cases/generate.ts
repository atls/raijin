import type { GenerateProjectInput }  from '../inputs/generate.js'
import type { ProjectScaffolder }     from '../ports/scaffolder.js'
import type { GenerateProjectResult } from '../results/generate.js'

import { isProjectScaffoldType }      from '../inputs/generate.js'
import { projectScaffoldTypes }       from '../inputs/generate.js'

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
