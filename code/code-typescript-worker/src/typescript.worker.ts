import type { CompilerOptions } from 'typescript'
import type { Diagnostic }      from 'typescript'

import { EvalWorker }           from '@atls/code-worker-utils'

import { getContent }           from './typescript.worker.content.js'

export class TypeScriptWorker {
  constructor(protected readonly cwd: string) {}

  async check(cwd: string, include: Array<string>): Promise<Array<Diagnostic>> {
    process.chdir(this.cwd)

    return EvalWorker.run(this.cwd, getContent(), {
      cwd,
      type: 'check',
      include,
    })
  }

  async build(
    cwd: string,
    include: Array<string> = [],
    override: Partial<CompilerOptions> = {}
  ): Promise<Array<Diagnostic>> {
    process.chdir(this.cwd)

    return EvalWorker.run(this.cwd, getContent(), {
      cwd,
      type: 'build',
      include,
      override,
    })
  }
}
