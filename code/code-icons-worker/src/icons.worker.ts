import { EvalWorker } from '@atls/code-worker-utils'

import { getContent } from './icons.worker.content.js'

export class IconsWorker {
  constructor(private readonly cwd: string) {}

  async run(cwd: string): Promise<void> {
    return EvalWorker.run(this.cwd, getContent(), {
      cwd,
    })
  }
}
