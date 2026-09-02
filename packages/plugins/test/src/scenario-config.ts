import type { TestScenario } from './interfaces/input.js'

export const scenarioConfig: Record<
  TestScenario,
  { readonly concurrency: boolean; readonly timeout: number }
> = {
  general: { concurrency: true, timeout: 420_000 },
  integration: { concurrency: false, timeout: 420_000 },
  unit: { concurrency: true, timeout: 240_000 },
}
