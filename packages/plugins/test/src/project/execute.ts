import type { ProjectTestInput }            from './input.js'
import type { ProjectTestPorts }            from './ports/execution.js'
import type { ProjectTestResult }           from './result.js'

import { toNativeCwd }                      from '@atls/raijin/commands'

import { createProjectTestProviderFailure } from './result.js'
import { getScenarioPolicy }                from './scenario.js'

export const executeProjectTestsWithPorts = async (
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
  ports: ProjectTestPorts
): Promise<ProjectTestResult> => {
  const executionCwd = toNativeCwd(invocation.executionCwd)
  const projectCwd = toNativeCwd(invocation.project.cwd)
  let files: Array<string>

  try {
    files = await ports.discover({ executionCwd, input, projectCwd, scenario })
  } catch (error) {
    return createProjectTestProviderFailure({
      cause: error,
      providerReason: 'discovery-failed',
      stage: 'discovery',
    })
  }

  let execArgv: Array<string>

  try {
    execArgv = await ports.resolveRuntimeArgv(executionCwd)
  } catch (error) {
    return createProjectTestProviderFailure({
      cause: error,
      providerReason: 'runtime-argv-failed',
      stage: 'runtime-argv',
    })
  }

  const policy = getScenarioPolicy(scenario)
  try {
    return await ports.invokeChild({
      cancelSignal,
      executionCwd,
      node: invocation.node,
      output,
      processTimeoutMs,
      run: {
        ...policy,
        execArgv,
        files,
        projectCwd,
        reporter,
        watch,
      },
    })
  } catch (error) {
    return createProjectTestProviderFailure({
      cause: error,
      providerReason: 'managed-execution-failed',
      stage: 'managed-execution',
    })
  }
}
