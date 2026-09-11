import assert                           from 'node:assert/strict'
import { test }                         from 'node:test'

import { updateBootstrapConfiguration } from './bootstrap.js'

test('should update yarn path in existing yarnrc', () => {
  assert.equal(
    updateBootstrapConfiguration(
      'nodeLinker: pnp\nyarnPath: .yarn/releases/yarn.mjs\n',
      '.yarn/releases/yarn.mjs'
    ),
    'nodeLinker: pnp\nyarnPath: .yarn/releases/yarn.mjs\n'
  )
})

test('should append yarn path to yarnrc without one', () => {
  assert.equal(
    updateBootstrapConfiguration('nodeLinker: pnp\n', '.yarn/releases/yarn.mjs'),
    'nodeLinker: pnp\nyarnPath: .yarn/releases/yarn.mjs\n'
  )
})

test('should pin pnp linker in yarnrc', () => {
  assert.equal(
    updateBootstrapConfiguration(
      'nodeLinker: node-modules\nenableGlobalCache: false\n',
      '.yarn/releases/yarn.mjs'
    ),
    'enableGlobalCache: false\nnodeLinker: pnp\nyarnPath: .yarn/releases/yarn.mjs\n'
  )
})
