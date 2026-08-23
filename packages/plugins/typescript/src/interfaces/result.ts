import type { ts as typescript } from '@atls/raijin/typescript'

export type TypecheckTerminal =
  | { readonly exitCode: 0; readonly reason: 'clean' }
  | { readonly exitCode: 1; readonly reason: 'diagnostics' }
  | { readonly exitCode: 1; readonly reason: 'provider-failed' }

type TypecheckProjectCompletedFields = {
  readonly status: 'completed'
  readonly diagnostics: ReadonlyArray<typescript.Diagnostic>
  readonly files: ReadonlyArray<string>
}

export type TypecheckProjectCompletedResult = TypecheckProjectCompletedFields &
  (
    | { readonly terminal: Extract<TypecheckTerminal, { reason: 'clean' }> }
    | { readonly terminal: Extract<TypecheckTerminal, { reason: 'diagnostics' }> }
  )

export type TypecheckProjectProviderFailedResult = {
  readonly status: 'provider-failed'
  readonly failure: {
    readonly name: string
    readonly message: string
  }
  readonly terminal: Extract<TypecheckTerminal, { reason: 'provider-failed' }>
}

export type TypecheckProjectResult =
  | TypecheckProjectCompletedResult
  | TypecheckProjectProviderFailedResult
