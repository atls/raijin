import type { ProjectScaffolder } from './project-scaffolder.port.js'

import assert                     from 'node:assert/strict'
import { test }                   from 'node:test'

import { generateProject }        from './generate-project.js'

const input = {
  scaffoldType: 'project' as const,
  target: '/repo/client',
}

test('should return the generated artifact contract from the scaffolder port', async () => {
  const scaffolder: ProjectScaffolder = {
    generate: async () => ({
      status: 'succeeded',
      artifacts: [{ operation: 'create', path: '/eslint.config.mjs', size: 80 }],
      diagnostics: [{ level: 'info', message: 'Generated project scaffold' }],
    }),
  }

  assert.deepEqual(await generateProject(input, { scaffolder }), {
    status: 'succeeded',
    artifacts: [{ operation: 'create', path: '/eslint.config.mjs', size: 80 }],
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
    artifacts: [],
    diagnostics: [],
    failure: {
      code: 'project-scaffolder-failed',
      message: 'Project scaffolder failed unexpectedly: provider unavailable',
    },
  })
})
