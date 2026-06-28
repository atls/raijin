import assert                         from 'node:assert/strict'
import { test }                       from 'node:test'

import { SchematicWorkflowException } from '../../exceptions/index.js'
import { ensureSchematicSucceeded }   from '../schematic-result.js'

test('should reject failed schematic exit code', () => {
  assert.throws(() => {
    ensureSchematicSucceeded(1)
  }, SchematicWorkflowException)
})

test('should accept successful schematic exit code', () => {
  assert.doesNotThrow(() => {
    ensureSchematicSucceeded(0)
  })
})
