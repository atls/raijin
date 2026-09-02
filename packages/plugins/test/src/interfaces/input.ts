import type { CommandInput } from '@atls/raijin/commands'
import type { Writable }     from 'node:stream'

export type TestReporter = 'silent' | 'spec' | 'tap'
export type TestScenario = 'general' | 'integration' | 'unit'

export interface TestProjectInput {
  readonly rootCwd: string
  readonly cwd: string
  readonly input: CommandInput
  readonly reporter?: TestReporter
  readonly signal?: AbortSignal
  readonly stdout?: Writable
  readonly scenario: TestScenario
  readonly watch?: boolean
}
