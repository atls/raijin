import type { PublishOptions } from 'jsr'

import { publish }             from 'jsr'

export class JSR {
  constructor(private readonly cwd: string) {}

  async publish(options: PublishOptions) {
    await publish(this.cwd, options)
  }
}
