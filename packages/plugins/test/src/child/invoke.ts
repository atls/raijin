import type { TestChildInput }     from '../project/ports/child.js'

import { fileURLToPath }           from 'node:url'

import { TEST_EXECUTION_CHANNEL }  from './protocol.js'
import { TEST_PRODUCER_PATH }      from './protocol.js'
import { createProjectTestResult } from './projection.js'

const resolveEntry = (): string => fileURLToPath(import.meta.url)

export const invokeTestChild = async ({
  cancelSignal,
  executionCwd,
  node,
  output,
  processTimeoutMs,
  run,
}: TestChildInput) => {
  const result = await node.execute({
    arguments: [...TEST_PRODUCER_PATH],
    cancelSignal,
    channel: {
      input: {
        channel: TEST_EXECUTION_CHANNEL,
        input: run,
        type: 'execute',
      },
    },
    cwd: executionCwd,
    entry: resolveEntry(),
    input: 'ignore',
    output: output ?? (run.reporter === 'silent' ? { mode: 'capture' } : undefined),
    timeoutMs: processTimeoutMs,
  })

  return createProjectTestResult(result)
}
