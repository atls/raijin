import { accessSync }            from 'node:fs'
import { join }                  from 'node:path'

import type { AggregatedResult } from '@jest/test-result'
import type { Config }           from '@jest/types'

import { runCLI }                from '@atls/code-runtime/jest'
import { integration }           from '@atls/code-runtime/jest'
import { unit }                  from '@atls/code-runtime/jest'

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
      globalSetup: this.isFileExists(join(this.cwd, '.config/test/unit/global-setup.ts'))
        ? join(this.cwd, '.config/test/unit/global-setup.ts')
        : undefined,
      globalTeardown: this.isFileExists(join(this.cwd, '.config/test/unit/global-teardown.ts'))
        ? join(this.cwd, '.config/test/unit/global-teardown.ts')
        : undefined,
      setupFilesAfterEnv: this.isFileExists(join(this.cwd, '.config/test/unit/setup.ts'))
        ? [join(this.cwd, '.config/test/unit/setup.ts')]
        : [],
    }

    const argv = {
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
      $0: '',
      ...options,
    }

    const { results } = await runCLI(argv, [this.cwd])

    return results
  }

  async integration(options?: Partial<Config.Argv>, files?: string[]): Promise<AggregatedResult> {
    process.env.TS_JEST_DISABLE_VER_CHECKER = 'true'

    const setup = {
      globalSetup: this.isFileExists(join(this.cwd, '.config/test/integration/global-setup.ts'))
        ? join(this.cwd, '.config/test/integration/global-setup.ts')
        : undefined,
      globalTeardown: this.isFileExists(
        join(this.cwd, '.config/test/integration/global-teardown.ts')
      )
        ? join(this.cwd, '.config/test/integration/global-teardown.ts')
        : undefined,
      setupFilesAfterEnv: this.isFileExists(join(this.cwd, '.config/test/integration/setup.ts'))
        ? [join(this.cwd, '.config/test/integration/setup.ts')]
        : [],
    }

    const argv = {
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
      $0: '',
      ...options,
    }

    const { results } = await runCLI(argv, [this.cwd])

    return results
  }
}
