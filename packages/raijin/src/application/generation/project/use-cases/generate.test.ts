import type { ProjectScaffolder } from '../ports/scaffolder.js'

import assert                     from 'node:assert/strict'
import { test }                   from 'node:test'

import { generateProject }        from './generate.js'

test('should pass every supported scaffold type to the scaffolder', async () => {
  const requestedTypes: Array<string> = []
  const scaffolder: ProjectScaffolder = {
    scaffold: async (scaffoldType) => {
      requestedTypes.push(scaffoldType)

      return { status: 'generated', changes: [] }
    },
  }

  assert.deepEqual(await generateProject({ scaffoldType: 'project' }, { scaffolder }), {
    status: 'generated',
    changes: [],
  })
  assert.deepEqual(await generateProject({ scaffoldType: 'library' }, { scaffolder }), {
    status: 'generated',
    changes: [],
  })
  assert.deepEqual(requestedTypes, ['project', 'library'])
})

test('should reject an unsupported scaffold type before calling the scaffolder', async () => {
  let calls = 0
  const scaffolder: ProjectScaffolder = {
    scaffold: async () => {
      calls += 1

      return { status: 'generated', changes: [] }
    },
  }

  assert.deepEqual(await generateProject({ scaffoldType: 'service' }, { scaffolder }), {
    status: 'rejected',
    failure: {
      code: 'unsupported-project-scaffold-type',
      message: 'Unsupported project scaffold type "service". Expected one of: library, project.',
    },
  })
  assert.equal(calls, 0)
})

test('should preserve a semantic scaffolding failure', async () => {
  const scaffolder: ProjectScaffolder = {
    scaffold: async () => ({
      status: 'failed',
      changes: [],
      failure: {
        code: 'project-scaffolding-failed',
        message: 'Collection is unavailable',
      },
    }),
  }

  assert.deepEqual(await generateProject({ scaffoldType: 'project' }, { scaffolder }), {
    status: 'failed',
    changes: [],
    failure: {
      code: 'project-scaffolding-failed',
      message: 'Collection is unavailable',
    },
  })
})

test('should not translate an unexpected scaffolder exception', async () => {
  const failure = new Error('unexpected provider failure')
  const scaffolder: ProjectScaffolder = {
    scaffold: async () => {
      throw failure
    },
  }

  await assert.rejects(
    generateProject({ scaffoldType: 'project' }, { scaffolder }),
    (error) => error === failure
  )
})
