import type { ESLint as ESLintType } from 'eslint'
import type { Linter as LinterType } from 'eslint'

import { createRequire }             from 'node:module'

import eslintconfig                  from './eslint-config/index.js'

const require = createRequire(import.meta.url)
const { Linter: RuntimeLinter, ESLint: RuntimeESLint } = require('eslint') as {
  Linter: typeof LinterType
  ESLint: typeof ESLintType
}

export const Linter = RuntimeLinter
export const ESLint = RuntimeESLint

export type ESLintInstance = ESLintType
export type LinterConfig = LinterType.Config
export type LinterInstance = LinterType
export type LintMessage = LinterType.LintMessage
export type LintResult = ESLintType.LintResult

export { eslintconfig }
