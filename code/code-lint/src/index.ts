import type { ESLint } from 'eslint'
import type { Linter } from 'eslint'

export type LintResult = ESLint.LintResult
export type Severity = Linter.Severity

export * from './linter'
export * from './lint.progress-report'
