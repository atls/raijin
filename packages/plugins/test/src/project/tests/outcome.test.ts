import assert                               from 'node:assert/strict'
import { test }                             from 'node:test'

import { createProjectTestOutcome }         from '../outcome.js'
import { createProjectTestProviderFailure } from '../result.js'

test('keeps expected capability failures non-zero through the shared consumer mapping', () => {
  const discovery = createProjectTestProviderFailure({
    cause: new Error('Test target does not exist: missing.test.ts'),
    providerReason: 'discovery-failed',
    stage: 'discovery',
  })
  const runtime = createProjectTestProviderFailure({
    cause: new Error('Raijin runtime argv provider is unavailable'),
    providerReason: 'runtime-argv-failed',
    stage: 'runtime-argv',
  })

  const cliOutcome = createProjectTestOutcome(discovery)
  const checksOutcome = createProjectTestOutcome(runtime)

  assert.deepEqual(cliOutcome, {
    exitCode: 1,
    summary: 'Test target does not exist: missing.test.ts',
  })
  assert.deepEqual(checksOutcome, {
    exitCode: 1,
    summary: 'Raijin runtime argv provider is unavailable',
  })
})
