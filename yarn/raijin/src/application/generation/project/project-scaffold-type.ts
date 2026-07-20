import type { ProjectScaffoldType }       from './generate-project.interfaces.js'
import type { ProjectScaffoldTypeResult } from './generate-project.interfaces.js'

export const PROJECT_SCAFFOLD_TYPES = ['library', 'project'] as const

const isProjectScaffoldType = (value: string): value is ProjectScaffoldType =>
  (PROJECT_SCAFFOLD_TYPES as ReadonlyArray<string>).includes(value)

export const resolveProjectScaffoldType = (value: string): ProjectScaffoldTypeResult => {
  if (isProjectScaffoldType(value)) {
    return {
      status: 'accepted',
      scaffoldType: value,
    }
  }

  return {
    status: 'rejected',
    failure: {
      code: 'invalid-scaffold-type',
      message: `Unsupported project scaffold type "${value}". Expected one of: ${PROJECT_SCAFFOLD_TYPES.join(', ')}.`,
    },
  }
}
