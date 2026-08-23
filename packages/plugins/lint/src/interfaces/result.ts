export type LintDiagnostic = {
  readonly ruleId: string | null
  readonly severity: 1 | 2
  readonly message: string
  readonly line: number
  readonly column: number
  readonly endLine?: number
  readonly endColumn?: number
  readonly fatal?: boolean
}

export type LintCounts = {
  readonly errors: number
  readonly fatalErrors: number
  readonly warnings: number
  readonly fixableErrors: number
  readonly fixableWarnings: number
}

export type LintFileResult = {
  readonly filePath: string
  readonly diagnostics: ReadonlyArray<LintDiagnostic>
  readonly source?: string
  readonly fixedContent?: string
  readonly counts: LintCounts
}

export type LintTerminal =
  | { readonly exitCode: 0; readonly reason: 'clean' }
  | { readonly exitCode: 1; readonly reason: 'diagnostics' }
  | { readonly exitCode: 1; readonly reason: 'provider-failed' }

type LintProjectCompletedFields = {
  readonly status: 'completed'
  readonly results: ReadonlyArray<LintFileResult>
  readonly counts: LintCounts
  readonly output: string
}

export type LintProjectCompletedResult = LintProjectCompletedFields &
  (
    | { readonly terminal: Extract<LintTerminal, { reason: 'clean' }> }
    | { readonly terminal: Extract<LintTerminal, { reason: 'diagnostics' }> }
  )

export type LintProjectProviderFailedResult = {
  readonly status: 'provider-failed'
  readonly failure: {
    readonly name: string
    readonly message: string
  }
  readonly terminal: Extract<LintTerminal, { reason: 'provider-failed' }>
}

export type LintProjectResult = LintProjectCompletedResult | LintProjectProviderFailedResult
