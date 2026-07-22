import type { ProjectScaffolder } from '../ports/scaffolder.js'

import assert                     from 'node:assert/strict'
import { test }                   from 'node:test'

import { generateProject }        from './generate.js'

const input = {
  scaffoldType: 'project' as const,
  targetPath: '/repo/client',
}

test('should return the project generation result from the scaffolder port', async () => {
  const scaffolder: ProjectScaffolder = {
    generate: async () => ({
      status: 'succeeded',
      changes: [{ kind: 'created', path: '/eslint.config.mjs', size: 80 }],
      diagnostics: [{ level: 'info', message: 'Generated project scaffold' }],
    }),
  }

  assert.deepEqual(await generateProject(input, { scaffolder }), {
    status: 'succeeded',
    changes: [{ kind: 'created', path: '/eslint.config.mjs', size: 80 }],
    diagnostics: [{ level: 'info', message: 'Generated project scaffold' }],
  })
})

test('should translate an unexpected provider exception into a typed scenario result', async () => {
  const scaffolder: ProjectScaffolder = {
    generate: async () => {
      throw new Error('provider unavailable')
    },
  }

  assert.deepEqual(await generateProject(input, { scaffolder }), {
    status: 'failed',
    changes: [],
    diagnostics: [],
    failure: {
      code: 'project-scaffold-unexpected-failure',
      message: 'Project scaffold failed unexpectedly: provider unavailable',
    },
  })
})
