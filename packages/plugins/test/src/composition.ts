import type { ProjectTestInput }        from './project/input.js'
import type { ProjectTestResult }       from './project/result.js'

import { TestDiscovery }                from './discovery.js'
import { invokeTestChild }              from './child/invoke.js'
import { executeProjectTestsWithPorts } from './project/execute.js'
import { createRuntimeArgv }            from './runtime-argv.js'

export const executeProjectTests = async (input: ProjectTestInput): Promise<ProjectTestResult> =>
  executeProjectTestsWithPorts(input, {
    discover: async ({ executionCwd, input: commandInput, projectCwd, scenario }) =>
      new TestDiscovery(executionCwd, projectCwd).collect(commandInput, scenario),
    invokeChild: invokeTestChild,
    resolveRuntimeArgv: createRuntimeArgv,
  })
