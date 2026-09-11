import type { LibraryArtifact }      from './artifact.js'
import type { LibraryArtifactIssue } from './artifact.js'
import type { LibraryDiagnostic }    from './diagnostic.js'

export interface LibraryBuildCompletedResult {
  readonly artifact: LibraryArtifact
  readonly diagnostics: ReadonlyArray<LibraryDiagnostic>
  readonly kind: 'completed'
}

export interface LibraryBuildCompilationFailure {
  readonly diagnostics: ReadonlyArray<LibraryDiagnostic>
  readonly kind: 'compilation-failed'
  readonly targetRoot: string
}

export interface LibraryBuildArtifactFailure {
  readonly diagnostics: ReadonlyArray<LibraryDiagnostic>
  readonly issues: ReadonlyArray<LibraryArtifactIssue>
  readonly kind: 'artifact-invalid'
  readonly targetRoot: string
}

export type LibraryBuildResult =
  | LibraryBuildArtifactFailure
  | LibraryBuildCompilationFailure
  | LibraryBuildCompletedResult
