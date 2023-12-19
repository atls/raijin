import type { CompilerOptions } from 'typescript'
import type { Diagnostic }      from 'typescript'

import { EvalWorker }           from '@atls/code-worker-utils-new'

import { getContent }           from './typescript.worker.content'

export class TypeScriptWorker {
  constructor(protected readonly cwd: string) {}

  async check(include: Array<string>): Promise<Array<Diagnostic>> {
    const originalCwd = process.cwd()

    process.chdir(this.cwd)

    return EvalWorker.run(getContent(), {
      cwd: originalCwd,
      type: 'check',
      include,
    })
  }

  async build(
    include: Array<string> = [],
    override: Partial<CompilerOptions> = {}
  ): Promise<Array<Diagnostic>> {
    const originalCwd = process.cwd()

    process.chdir(this.cwd)

    return EvalWorker.run(getContent(), {
      cwd: originalCwd,
      type: 'build',
      include,
      override,
    })
  }
}
