import type { ProjectScaffolder } from './project-scaffolder.port.js'

export type ProjectScaffoldType = 'library' | 'project'

export type GeneratedProjectArtifactOperation = 'create' | 'delete' | 'rename' | 'update'

export interface GeneratedProjectArtifact {
  readonly operation: GeneratedProjectArtifactOperation
  readonly path: string
  readonly destination?: string
  readonly size?: number
}

export type ProjectGenerationDiagnosticLevel = 'debug' | 'error' | 'info' | 'warning'

export interface ProjectGenerationDiagnostic {
  readonly level: ProjectGenerationDiagnosticLevel
  readonly message: string
}

export type ProjectGenerationFailureCode =
  | 'invalid-scaffold-type'
  | 'project-collection-unavailable'
  | 'project-scaffolder-failed'
  | 'project-schematic-failed'

export interface ProjectGenerationFailure {
  readonly code: ProjectGenerationFailureCode
  readonly message: string
}

export interface GenerateProjectInput {
  readonly scaffoldType: ProjectScaffoldType
  readonly target: string
}

export interface GenerateProjectDependencies {
  readonly scaffolder: ProjectScaffolder
}

export interface ProjectGenerationSucceeded {
  readonly status: 'succeeded'
  readonly artifacts: ReadonlyArray<GeneratedProjectArtifact>
  readonly diagnostics: ReadonlyArray<ProjectGenerationDiagnostic>
}

export interface ProjectGenerationFailed {
  readonly status: 'failed'
  readonly artifacts: ReadonlyArray<GeneratedProjectArtifact>
  readonly diagnostics: ReadonlyArray<ProjectGenerationDiagnostic>
  readonly failure: ProjectGenerationFailure
}

export type ProjectGenerationResult = ProjectGenerationFailed | ProjectGenerationSucceeded

export interface ProjectScaffoldTypeAccepted {
  readonly status: 'accepted'
  readonly scaffoldType: ProjectScaffoldType
}

export interface ProjectScaffoldTypeRejected {
  readonly status: 'rejected'
  readonly failure: ProjectGenerationFailure
}

export type ProjectScaffoldTypeResult = ProjectScaffoldTypeAccepted | ProjectScaffoldTypeRejected
