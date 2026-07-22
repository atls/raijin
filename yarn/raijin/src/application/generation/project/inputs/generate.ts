import type { ProjectGenerationFailure } from '../results/generate.js'

export type ProjectScaffoldType = 'library' | 'project'

export interface GenerateProjectInput {
  readonly scaffoldType: ProjectScaffoldType
  readonly targetPath: string
}

export interface ProjectScaffoldTypeAccepted {
  readonly status: 'accepted'
  readonly scaffoldType: ProjectScaffoldType
}

export interface ProjectScaffoldTypeRejected {
  readonly status: 'rejected'
  readonly failure: ProjectGenerationFailure
}

export type ProjectScaffoldTypeResult = ProjectScaffoldTypeAccepted | ProjectScaffoldTypeRejected

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
