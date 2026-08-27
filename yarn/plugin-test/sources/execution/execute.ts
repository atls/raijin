import type { ProjectTestInput }            from './input.js'
import type { TestProducerInput }           from './input.js'
import type { ProjectTestResult }           from './result.js'

import { toNativeCwd }                      from '@atls/raijin/commands'

import { TEST_EXECUTION_CHANNEL }           from './ipc.js'
import { TEST_PRODUCER_PATH }               from './producer.js'
import { createTestRuntimeExecArgv }        from './exec-argv.js'
import { parseTestExecArgv }                from './exec-argv.js'
import { getScenarioPolicy }                from './input.js'
import { resolveTestProducerEntry }         from './producer.js'
import { createProjectTestProviderFailure } from './result.js'
import { createProjectTestResult }          from './result.js'

interface TestDiscoveryInput {
  executionCwd: string
  input: ProjectTestInput['input']
  projectCwd: string
  scenario: ProjectTestInput['scenario']
}

export interface ProjectTestExecutionProviders {
  discover: (input: TestDiscoveryInput) => Promise<Array<string>>
  resolveRuntimeExecArgv: (executionCwd: string) => Promise<Array<string>>
}

const defaultProviders: ProjectTestExecutionProviders = {
  discover: async ({ executionCwd, input, projectCwd, scenario }) => {
    const { TestDiscovery } = await import('./discovery.js')

    return new TestDiscovery(executionCwd, projectCwd).collect(input, scenario)
  },
  resolveRuntimeExecArgv: async (executionCwd) => {
    const explicitExecArgv = parseTestExecArgv()

    return explicitExecArgv.length > 0 ? explicitExecArgv : createTestRuntimeExecArgv(executionCwd)
  },
}

export const executeProjectTestsWithProviders = async (
  {
    cancelSignal,
    input,
    invocation,
    output,
    processTimeoutMs,
    reporter = 'spec',
    scenario,
    watch = false,
  }: ProjectTestInput,
  providers: ProjectTestExecutionProviders
): Promise<ProjectTestResult> => {
  const executionCwd = toNativeCwd(invocation.executionCwd)
  const projectCwd = toNativeCwd(invocation.project.cwd)
  let files: Array<string>

  try {
    files = await providers.discover({ executionCwd, input, projectCwd, scenario })
  } catch (error) {
    return createProjectTestProviderFailure({
      cause: error,
      providerReason: 'discovery-failed',
      stage: 'discovery',
    })
  }

  let execArgv: Array<string>

  try {
    execArgv = await providers.resolveRuntimeExecArgv(executionCwd)
  } catch (error) {
    return createProjectTestProviderFailure({
      cause: error,
      providerReason: 'runtime-argv-failed',
      stage: 'runtime-argv',
    })
  }

  const policy = getScenarioPolicy(scenario)
  const producerInput: TestProducerInput = {
    ...policy,
    execArgv,
    files,
    projectCwd,
    reporter,
    watch,
  }

  try {
    const managedResult = await invocation.node.execute({
      arguments: [...TEST_PRODUCER_PATH],
      cancelSignal,
      channel: {
        input: {
          channel: TEST_EXECUTION_CHANNEL,
          input: producerInput,
          type: 'execute',
        },
      },
      cwd: executionCwd,
      entry: resolveTestProducerEntry(),
      input: 'ignore',
      output: output ?? (reporter === 'silent' ? { mode: 'capture' } : undefined),
      timeoutMs: processTimeoutMs,
    })

    return createProjectTestResult(managedResult)
  } catch (error) {
    return createProjectTestProviderFailure({
      cause: error,
      providerReason: 'managed-execution-failed',
      stage: 'managed-execution',
    })
  }
}

export const executeProjectTests = async (input: ProjectTestInput): Promise<ProjectTestResult> =>
  executeProjectTestsWithProviders(input, defaultProviders)
