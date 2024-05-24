import type { ESLint }      from '@atls/code-runtime/eslint'
import type { LintOptions } from '@atls/code-lint'

import { EvalWorker }       from '@atls/code-worker-utils'

import { getContent }       from './linter.worker.content.js'

export class LinterWorker {
  constructor(private readonly cwd: string) {}

  async run(
    cwd: string,
    files: Array<string> = [],
    options?: LintOptions
  ): Promise<Array<ESLint.LintResult>> {
    return EvalWorker.run(this.cwd, getContent(), {
      rootCwd: this.cwd,
      cwd,
      options,
      files,
    })
  }
}
