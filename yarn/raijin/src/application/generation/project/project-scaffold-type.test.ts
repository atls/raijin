import assert                         from 'node:assert/strict'
import { test }                       from 'node:test'

import { resolveProjectScaffoldType } from './project-scaffold-type.js'

test('should accept every owned project scaffold type', () => {
  assert.deepEqual(resolveProjectScaffoldType('project'), {
    status: 'accepted',
    scaffoldType: 'project',
  })
  assert.deepEqual(resolveProjectScaffoldType('library'), {
    status: 'accepted',
    scaffoldType: 'library',
  })
})

test('should return a typed failure for an unsupported scaffold type', () => {
  assert.deepEqual(resolveProjectScaffoldType('service'), {
    status: 'rejected',
    failure: {
      code: 'invalid-scaffold-type',
      message: 'Unsupported project scaffold type "service". Expected one of: library, project.',
    },
  })
})
