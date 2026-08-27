import assert                               from 'node:assert/strict'
import { test }                             from 'node:test'

import { createProjectTestOutcome }         from '../execution/index.js'
import { createProjectTestProviderFailure } from '../execution/result.js'

test('keeps typed capability failures non-zero in the CLI route', () => {
  const result = createProjectTestProviderFailure({
    cause: new Error('Test target does not exist: missing.test.ts'),
    providerReason: 'discovery-failed',
    stage: 'discovery',
  })

  assert.deepEqual(createProjectTestOutcome(result), {
    exitCode: 1,
    summary: 'Test target does not exist: missing.test.ts',
  })
})
