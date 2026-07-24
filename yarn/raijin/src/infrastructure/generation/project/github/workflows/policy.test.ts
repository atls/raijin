import assert                            from 'node:assert/strict'
import { test }                          from 'node:test'

import { createGeneratedWorkflowPolicy } from './policy.js'

test('should derive the generated Node line from the Raijin package manifest', () => {
  assert.deepEqual(
    createGeneratedWorkflowPolicy({
      devDependencies: {
        '@types/node': '24.12.2',
      },
    }),
    {
      checkoutAction: 'actions/checkout@v6',
      containerRegistry: 'ghcr.io',
      containerRegistryOwnerExpression: 'github.repository_owner',
      nodeVersion: '24',
      npmTokenSecret: 'NPM_TOKEN',
      setupNodeAction: 'actions/setup-node@v6',
    }
  )
})

test('should accept ranged Node type versions from the package manifest', () => {
  assert.equal(
    createGeneratedWorkflowPolicy({
      dependencies: {
        '@types/node': '^30.1.0',
      },
    }).nodeVersion,
    '30'
  )
})

test('should fail when the package manifest does not expose a Node type version', () => {
  assert.throws(
    () => createGeneratedWorkflowPolicy({}),
    /does not declare a semver @types\/node version/
  )
})
