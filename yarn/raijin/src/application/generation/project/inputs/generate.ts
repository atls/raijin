export const projectScaffoldTypes = ['library', 'project'] as const

export type ProjectScaffoldType = (typeof projectScaffoldTypes)[number]

export interface GenerateProjectInput {
  scaffoldType: string
}

export const isProjectScaffoldType = (value: string): value is ProjectScaffoldType =>
  projectScaffoldTypes.some((scaffoldType) => scaffoldType === value)
