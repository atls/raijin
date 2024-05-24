import type { ESLint } from '@atls/code-runtime/eslint'

import { EvalWorker }  from '@atls/code-worker-utils'

import { getContent }  from './linter.worker.content.js'

export class LinterWorker {
  constructor(private readonly cwd: string) {}

  async run(files: Array<string> = []): Promise<Array<ESLint.LintResult>> {
    return EvalWorker.run(getContent(), {
      cwd: this.cwd,
      files,
    })
  }
}
