import type { TestScenario } from './input.js'

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
