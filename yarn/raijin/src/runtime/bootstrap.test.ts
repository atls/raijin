import assert                          from 'node:assert/strict'
import { test }                        from 'node:test'

import { updateYarnPathConfiguration } from './bootstrap.js'

test('should update yarn path in existing yarnrc', () => {
  assert.equal(
    updateYarnPathConfiguration(
      'nodeLinker: pnp\nyarnPath: .yarn/releases/yarn.mjs\n',
      '.yarn/releases/raijin-yarn-1.2.3.mjs'
    ),
    'nodeLinker: pnp\nyarnPath: .yarn/releases/raijin-yarn-1.2.3.mjs\n'
  )
})

test('should append yarn path to yarnrc without one', () => {
  assert.equal(
    updateYarnPathConfiguration('nodeLinker: pnp\n', '.yarn/releases/raijin-yarn-1.2.3.mjs'),
    'nodeLinker: pnp\nyarnPath: .yarn/releases/raijin-yarn-1.2.3.mjs\n'
  )
})
