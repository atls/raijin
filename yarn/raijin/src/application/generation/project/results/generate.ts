export type ProjectGenerationChangeKind = 'created' | 'deleted' | 'renamed' | 'updated'

export interface ProjectGenerationChange {
  readonly kind: ProjectGenerationChangeKind
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
  | 'project-scaffold-failed'
  | 'project-scaffold-unexpected-failure'

export interface ProjectGenerationFailure {
  readonly code: ProjectGenerationFailureCode
  readonly message: string
}

export interface ProjectGenerationSucceeded {
  readonly status: 'succeeded'
  readonly changes: ReadonlyArray<ProjectGenerationChange>
  readonly diagnostics: ReadonlyArray<ProjectGenerationDiagnostic>
}

export interface ProjectGenerationFailed {
  readonly status: 'failed'
  readonly changes: ReadonlyArray<ProjectGenerationChange>
  readonly diagnostics: ReadonlyArray<ProjectGenerationDiagnostic>
  readonly failure: ProjectGenerationFailure
}

export type ProjectGenerationResult = ProjectGenerationFailed | ProjectGenerationSucceeded
