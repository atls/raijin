import type { ManagedNodeExecuteInput } from '@atls/raijin/commands'
import type { ProjectInvocation }       from '@atls/raijin/commands'

import type { TestReporter }            from '../input.js'
import type { ProjectTestResult }       from '../result.js'

export interface TestRunInput {
  concurrency: boolean
  execArgv: Array<string>
  files: Array<string>
  projectCwd: string
  reporter: TestReporter
  testTimeoutMs: number
  watch: boolean
}

export interface TestChildInput {
  cancelSignal?: AbortSignal
  executionCwd: string
  node: ProjectInvocation['node']
  output?: ManagedNodeExecuteInput['output']
  processTimeoutMs?: number
  run: TestRunInput
}

export type InvokeTestChild = (input: TestChildInput) => Promise<ProjectTestResult>
