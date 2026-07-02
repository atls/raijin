import { spawn }                        from 'node:child_process'

import { BaseCommand }                  from '@yarnpkg/cli'

import { createServiceRuntimeExecArgv } from '@atls/code-service'

export class ServiceStartCommand extends BaseCommand {
  static override paths = [['service', 'start']]

  async execute(): Promise<number> {
    const child = spawn(
      process.execPath,
      [...(await createServiceRuntimeExecArgv(this.context.cwd)), 'dist/index.js'],
      {
        cwd: this.context.cwd,
        env: process.env,
        stdio: [this.context.stdin, this.context.stdout, this.context.stderr],
      }
    )

    return new Promise<number>((resolve, reject) => {
      child.once('error', reject)
      child.once('exit', (code) => {
        resolve(code ?? 1)
      })
    })
  }
}
