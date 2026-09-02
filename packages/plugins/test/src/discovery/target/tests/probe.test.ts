import type { ProbeResult }    from '../probe.js'

import assert                  from 'node:assert/strict'
import { stat }                from 'node:fs/promises'
import { test }                from 'node:test'
import { fileURLToPath }       from 'node:url'

import { isExistingLocation }  from '../probe.js'
import { isUnexpectedFailure } from '../probe.js'

test('recognizes an existing location without classifying it as a failure', async () => {
  const path = fileURLToPath(import.meta.url)
  const result = { path, stat: await stat(path) }

  assert.equal(isExistingLocation(result), true)
  assert.equal(isUnexpectedFailure(result), false)
})

test('selects unexpected failures without replacing their error', () => {
  const missing = { error: Object.assign(new Error('missing'), { code: 'ENOENT' }) }
  const unexpected = { error: Object.assign(new Error('denied'), { code: 'EACCES' }) }

  assert.equal(isExistingLocation(missing), false)
  assert.equal(isUnexpectedFailure(missing), false)
  assert.equal(isUnexpectedFailure(unexpected), true)
  assert.equal([missing, unexpected].find(isUnexpectedFailure), unexpected)

  for (const error of [null, undefined, 'failure', 1]) {
    assert.equal(isUnexpectedFailure({ error }), true)
  }
})

test('keeps a missing failure assignable in the negative classification branch', () => {
  const error = Object.assign(new Error('missing'), { code: 'ENOENT' })
  const verify = (result: ProbeResult): void => {
    if (!isUnexpectedFailure(result)) {
      // A false classification must not narrow the union to an existing location.
      const retained: typeof result = { error }

      assert.deepEqual(result, retained)
    } else {
      assert.fail('A missing path must not be classified as an unexpected failure')
    }
  }

  verify({ error })
})
