import type { Result as ExecuteResult } from '../../../../../src/application/execution/node/index.js'

import nodeAssert from 'node:assert/strict'

type CompletedResult = Extract<ExecuteResult, { reason: 'completed' }>

export function assertCompleted(result: ExecuteResult): asserts result is CompletedResult {
  nodeAssert.equal(result.reason, 'completed', JSON.stringify(result))
}
