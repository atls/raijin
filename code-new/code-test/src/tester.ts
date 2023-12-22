import { accessSync }       from 'node:fs'
import { join }             from 'node:path'

import { AggregatedResult } from '@jest/test-result'
import { Config }           from '@jest/types'
import { runCLI }           from '@jest/core'

import { integration }      from '@atls/config-jest-new'
import { unit }             from '@atls/config-jest-new'

export class Tester {
  constructor(private readonly cwd: string) {}

  private isFileExists(file) {
    try {
      accessSync(file)

      return true
    } catch {
      return false
    }
  }

  async unit(options?: Partial<Config.Argv>, files?: string[]): Promise<AggregatedResult> {
    process.env.TS_JEST_DISABLE_VER_CHECKER = 'true'

    const setup = {
      globalSetup: this.isFileExists(join(this.cwd, '.config/test/unit/setup.ts'))
        ? join(this.cwd, '.config/test/unit/setup.ts')
        : undefined,
      globalTeardown: this.isFileExists(join(this.cwd, '.config/test/unit/teardown.ts'))
        ? join(this.cwd, '.config/test/unit/teardown.ts')
        : undefined,
    }

    const argv: any = {
      rootDir: this.cwd,
      ci: false,
      detectLeaks: false,
      detectOpenHandles: false,
      errorOnDeprecated: false,
      listTests: false,
      passWithNoTests: true,
      runTestsByPath: false,
      testLocationInResults: true,
      config: JSON.stringify({ ...unit, ...setup }),
      maxConcurrency: 5,
      notifyMode: 'failure-change',
      _: files || [],
      ...options,
    }

    const { results } = await runCLI(argv, [this.cwd])

    return results
  }

  async integration(options?: Partial<Config.Argv>, files?: string[]): Promise<AggregatedResult> {
    process.env.TS_JEST_DISABLE_VER_CHECKER = 'true'

    const setup = {
      globalSetup: this.isFileExists(join(this.cwd, '.config/test/integration/setup.ts'))
        ? join(this.cwd, '.config/test/integration/setup.ts')
        : undefined,
      globalTeardown: this.isFileExists(join(this.cwd, '.config/test/integration/teardown.ts'))
        ? join(this.cwd, '.config/test/integration/teardown.ts')
        : undefined,
    }

    const argv: any = {
      rootDir: this.cwd,
      ci: false,
      detectLeaks: false,
      detectOpenHandles: false,
      errorOnDeprecated: false,
      listTests: false,
      passWithNoTests: true,
      runTestsByPath: false,
      testLocationInResults: true,
      config: JSON.stringify({ ...integration, ...setup }),
      maxConcurrency: 5,
      notifyMode: 'failure-change',
      _: files || [],
      ...options,
    }

    const { results } = await runCLI(argv, [this.cwd])

    return results
  }
}
