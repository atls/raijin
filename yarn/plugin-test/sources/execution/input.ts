import type { CommandInput }            from '@atls/raijin/commands'
import type { ManagedNodeExecuteInput } from '@atls/raijin/commands'
import type { ProjectInvocation }       from '@atls/raijin/commands'

export type TestReporter = 'silent' | 'spec' | 'tap'
export type TestScenario = 'general' | 'integration' | 'unit'

interface ExecutionOptions {
  cancelSignal?: AbortSignal
  invocation: ProjectInvocation
  output?: ManagedNodeExecuteInput['output']
  processTimeoutMs?: number
  reporter?: TestReporter
  watch?: boolean
}

export interface GeneralTestInput extends ExecutionOptions {
  input: CommandInput
  scenario: 'general'
}

export interface IntegrationTestInput extends ExecutionOptions {
  input: CommandInput
  scenario: 'integration'
}

export interface UnitTestInput extends ExecutionOptions {
  input: CommandInput
  scenario: 'unit'
}

export type ProjectTestInput = GeneralTestInput | IntegrationTestInput | UnitTestInput

export interface TestProducerInput {
  concurrency: boolean
  execArgv: Array<string>
  files: Array<string>
  projectCwd: string
  reporter: TestReporter
  testTimeoutMs: number
  watch: boolean
}

interface ScenarioPolicy {
  concurrency: boolean
  testTimeoutMs: number
}

const SCENARIO_POLICIES: Record<TestScenario, ScenarioPolicy> = {
  general: { concurrency: true, testTimeoutMs: 420_000 },
  integration: { concurrency: false, testTimeoutMs: 420_000 },
  unit: { concurrency: true, testTimeoutMs: 240_000 },
}

export const getScenarioPolicy = (scenario: TestScenario): ScenarioPolicy =>
  SCENARIO_POLICIES[scenario]
