import type { ts as TypeScriptRuntime } from '@atls/raijin/typescript'

export type TypecheckCompletedResult = {
  readonly kind: 'completed'
  readonly diagnostics: ReadonlyArray<TypeScriptRuntime.Diagnostic>
  readonly exitCode: 0 | 1
}

export type TypecheckManagedError = {
  readonly kind: 'error'
  readonly reason: 'invalid-policy' | 'missing-project'
  readonly cwd: string
}

export type TypecheckResult = TypecheckCompletedResult | TypecheckManagedError
