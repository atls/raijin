export type ScaffoldChangeKind = 'created' | 'deleted' | 'renamed' | 'updated'

export interface ScaffoldChange {
  readonly kind: ScaffoldChangeKind
  readonly path: string
  readonly destination?: string
  readonly size?: number
}

export type ScaffoldDiagnosticLevel = 'debug' | 'error' | 'info' | 'warning'

export interface ScaffoldDiagnostic {
  readonly level: ScaffoldDiagnosticLevel
  readonly message: string
}

export type ScaffoldFailureCode =
  | 'invalid-scaffold-type'
  | 'project-collection-unavailable'
  | 'project-scaffold-failed'
  | 'project-scaffold-unexpected-failure'

export interface ScaffoldFailure {
  readonly code: ScaffoldFailureCode
  readonly message: string
}

export interface ScaffoldSucceeded {
  readonly status: 'succeeded'
  readonly changes: ReadonlyArray<ScaffoldChange>
  readonly diagnostics: ReadonlyArray<ScaffoldDiagnostic>
}

export interface ScaffoldFailed {
  readonly status: 'failed'
  readonly changes: ReadonlyArray<ScaffoldChange>
  readonly diagnostics: ReadonlyArray<ScaffoldDiagnostic>
  readonly failure: ScaffoldFailure
}

export type ScaffoldResult = ScaffoldFailed | ScaffoldSucceeded
