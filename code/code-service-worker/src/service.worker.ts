import type { ServiceBuildResult } from '@atls/code-service'

import { EvalWorker }              from '@atls/code-worker-utils'

import { getContent }              from './service.worker.content'

export class ServiceWorker {
  constructor(
    protected readonly cwd: string,
    protected readonly rootCwd: string
  ) {}

  async run(): Promise<ServiceBuildResult> {
    process.chdir(this.rootCwd)

    return EvalWorker.run<ServiceBuildResult>(getContent(), {
      cwd: this.cwd,
      environment: 'production',
    })
  }

  async watch(onMessage) {
    process.chdir(this.rootCwd)

    return EvalWorker.watch(
      getContent(),
      {
        environment: 'development',
        cwd: this.cwd,
      },
      onMessage
    )
  }
}
