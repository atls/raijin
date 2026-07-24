import type { Scaffolder }     from './port.interfaces.js'

import assert                  from 'node:assert/strict'
import { test }                from 'node:test'

import { resolveScaffoldType } from './use-case.js'
import { scaffoldProject }     from './use-case.js'

const input = {
  scaffoldType: 'project' as const,
  targetPath: '/repo/client',
}

test('should return the project generation result from the scaffolder port', async () => {
  const scaffolder: Scaffolder = {
    generate: async () => ({
      status: 'succeeded',
      changes: [{ kind: 'created', path: '/eslint.config.mjs', size: 80 }],
      diagnostics: [{ level: 'info', message: 'Generated project scaffold' }],
    }),
  }

  assert.deepEqual(await scaffoldProject(input, { scaffolder }), {
    status: 'succeeded',
    changes: [{ kind: 'created', path: '/eslint.config.mjs', size: 80 }],
    diagnostics: [{ level: 'info', message: 'Generated project scaffold' }],
  })
})

test('should accept every owned project scaffold type', () => {
  assert.deepEqual(resolveScaffoldType('project'), {
    status: 'accepted',
    scaffoldType: 'project',
  })
  assert.deepEqual(resolveScaffoldType('library'), {
    status: 'accepted',
    scaffoldType: 'library',
  })
})

test('should return a typed failure for an unsupported scaffold type', () => {
  assert.deepEqual(resolveScaffoldType('service'), {
    status: 'rejected',
    failure: {
      code: 'invalid-scaffold-type',
      message: 'Unsupported project scaffold type "service". Expected one of: library, project.',
    },
  })
})

test('should translate an unexpected provider exception into a typed scenario result', async () => {
  const scaffolder: Scaffolder = {
    generate: async () => {
      throw new Error('provider unavailable')
    },
  }

  assert.deepEqual(await scaffoldProject(input, { scaffolder }), {
    status: 'failed',
    changes: [],
    diagnostics: [],
    failure: {
      code: 'project-scaffold-unexpected-failure',
      message: 'Project scaffold failed unexpectedly: provider unavailable',
    },
  })
})
