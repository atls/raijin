import type { DryRunEvent } from '@angular-devkit/schematics'

import { EvalWorker }       from '@atls/code-worker-utils'

import { getContent }       from './schematics.worker.content'

export interface SchematicsWorkerRunOptions {
  type: 'generate' | 'migrate'
  cwd: string
  force: boolean
  dryRun: boolean
  schematicName: string
  migrationVersion: string
  options: object
}

export class SchematicsWorker {
  constructor(
    private readonly cwd: string,
    private readonly force = false,
    private readonly dryRun = false
  ) {}

  async run(
    type: 'migrate' | 'generate',
    schematicName: string,
    options = {}
  ): Promise<Array<DryRunEvent>> {
    return EvalWorker.run(getContent(), {
      type,
      cwd: this.cwd,
      force: this.force,
      dryRun: this.dryRun,
      schematicName,
      options,
    })
  }

  generate(schematicName: string, options = {}) {
    return this.run('generate', schematicName, options)
  }

  migrate(schematicName: string, options = {}) {
    return this.run('migrate', schematicName, options)
  }
}
