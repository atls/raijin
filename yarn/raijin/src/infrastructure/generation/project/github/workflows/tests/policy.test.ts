import assert           from 'node:assert/strict'
import { test }         from 'node:test'

import { createPolicy } from '../policy.js'

test('should derive the generated Node line and current workflow values from Raijin metadata', () => {
  assert.deepEqual(createPolicy({ devDependencies: { '@types/node': '24.12.2' } }), {
    checkoutAction: 'actions/checkout@v6',
    containerRegistry: 'ghcr.io',
    containerRepositoryExpression: 'github.repository',
    nodeVersion: '24',
    npmTokenSecret: 'NPM_TOKEN',
    setupNodeAction: 'actions/setup-node@v6',
  })
})

test('should accept a ranged Node types version', () => {
  assert.equal(createPolicy({ dependencies: { '@types/node': '^30.1.0' } }).nodeVersion, '30')
})

test('should reject a manifest without a semantic Node types version', () => {
  assert.throws(() => createPolicy({}), /does not declare a semver @types\/node version/)
  assert.throws(
    () => createPolicy({ devDependencies: { '@types/node': 'latest' } }),
    /does not declare a semver @types\/node version/
  )
})
