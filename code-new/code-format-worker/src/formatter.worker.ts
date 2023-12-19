import { EvalWorker } from '@atls/code-worker-utils-new'

import { getContent } from './formatter.worker.content'

export class FormatterWorker {
  constructor(private readonly cwd: string) {}

  async run(files: Array<string>) {
    return EvalWorker.run(getContent(), {
      cwd: this.cwd,
      files
    })
  }
}
