import { ESLint } from 'eslint'

export interface LintProgressReport {
  start(files: Array<string>): void
  lint(file: string, results: Array<ESLint.LintResult>): void
  end(): void
}

export class NullLintProgressReport implements LintProgressReport {
  start() {}

  lint() {}

  end() {}
}
