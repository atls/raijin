import type { ESLint } from 'eslint'

export interface ResolveEslintProjectOptions {
  readonly cache?: boolean
  readonly cacheLocation?: string
  readonly cwd: string
  readonly eslint: typeof ESLint
  readonly fix?: boolean
  readonly rootCwd: string
}

export type EslintProjectOptions = ESLint.Options
