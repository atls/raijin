export type LibraryDiagnosticCategory = 'error' | 'message' | 'suggestion' | 'warning'

export interface LibraryDiagnostic {
  readonly category: LibraryDiagnosticCategory
  readonly code: number
  readonly column?: number
  readonly file?: string
  readonly line?: number
  readonly message: string
  readonly sourceText?: string
}
