import assert              from 'node:assert/strict'
import { test }            from 'node:test'

import { ProducerCommand } from '../child/produce.js'
import { plugin }          from '../registration.js'

test('keeps the producer entry out of the normal plugin command surface', () => {
  assert.equal(plugin.commands?.includes(ProducerCommand), false)
})
