import assert                    from 'node:assert/strict'
import { test }                  from 'node:test'

import { createRendererDevArgs } from './renderer-dev.command.js'

test('should run Next dev from renderer workspace root', () => {
  assert.deepEqual(createRendererDevArgs(undefined), ['next', 'dev'])
})

test('should use explicit webpack dev arguments for Next versions after 15', () => {
  assert.deepEqual(createRendererDevArgs('16.2.10'), ['next', 'dev', '--webpack'])
})
