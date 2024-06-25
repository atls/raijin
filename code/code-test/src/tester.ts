import type { AggregatedResult } from '@jest/test-result'
import type { Config }           from '@jest/types'

import { constants }             from 'node:fs'
import { access }                from 'node:fs/promises'
import { join }                  from 'node:path'

import { runCLI }                from '@atls/code-runtime/jest'
import { integration }           from '@atls/code-runtime/jest'
import { unit }                  from '@atls/code-runtime/jest'

export class Tester {
  constructor(private readonly cwd: string) {}

  async unit(options?: Partial<Config.Argv>, files?: Array<string>): Promise<AggregatedResult> {
    process.env.TS_JEST_DISABLE_VER_CHECKER = 'true'

    const setup = {
      globalSetup: (await this.isConfigExists('.config/test/unit/global-setup.ts'))
        ? join(this.cwd, '.config/test/unit/global-setup.ts')
        : undefined,
      globalTeardown: (await this.isConfigExists('.config/test/unit/global-teardown.ts'))
        ? join(this.cwd, '.config/test/unit/global-teardown.ts')
        : undefined,
      setupFilesAfterEnv: (await this.isConfigExists('.config/test/unit/setup.ts'))
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

  async integration(
    options?: Partial<Config.Argv>,
    files?: Array<string>
  ): Promise<AggregatedResult> {
    process.env.TS_JEST_DISABLE_VER_CHECKER = 'true'

    const setup = {
      globalSetup: (await this.isConfigExists('.config/test/integration/global-setup.ts'))
        ? join(this.cwd, '.config/test/integration/global-setup.ts')
        : undefined,
      globalTeardown: (await this.isConfigExists('.config/test/integration/global-teardown.ts'))
        ? join(this.cwd, '.config/test/integration/global-teardown.ts')
        : undefined,
      setupFilesAfterEnv: (await this.isConfigExists('.config/test/integration/setup.ts'))
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

  private async isConfigExists(file: string): Promise<boolean> {
    try {
      await access(join(this.cwd, file), constants.R_OK)

      return true
    } catch {
      return false
    }
  }
}
