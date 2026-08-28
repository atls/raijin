import type { CommandInput } from '@atls/raijin/commands'

import type { TestScenario } from '../input.js'

export interface TestDiscoveryInput {
  executionCwd: string
  input: CommandInput
  projectCwd: string
  scenario: TestScenario
}

export type DiscoverProjectTests = (input: TestDiscoveryInput) => Promise<Array<string>>
