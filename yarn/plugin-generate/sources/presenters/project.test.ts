import type { MessageName }        from '@yarnpkg/core'

import assert                      from 'node:assert/strict'
import { test }                    from 'node:test'

import { reportProjectGeneration } from './project.js'

const createReport = () => {
  const errors: Array<string> = []
  const infos: Array<string> = []

  return {
    errors,
    infos,
    report: {
      reportError: (_name: MessageName, message: string) => errors.push(message),
      reportInfo: (_name: MessageName | null, message: string) => infos.push(message),
    },
  }
}

test('should render semantic project changes', () => {
  const { errors, infos, report } = createReport()

  reportProjectGeneration(report, {
    status: 'generated',
    changes: [
      { artifact: '/eslint.config.mjs', bytes: 80, kind: 'created' },
      { artifact: '/tsconfig.json', bytes: 120, kind: 'updated' },
      { artifact: '/retired.config.mjs', kind: 'deleted' },
      { artifact: '/before', destination: '/after', kind: 'renamed' },
    ],
  })

  assert.deepEqual(infos, [
    'CREATE /eslint.config.mjs (80 bytes)',
    'UPDATE /tsconfig.json (120 bytes)',
    'DELETE /retired.config.mjs',
    'RENAME /before -> /after',
  ])
  assert.deepEqual(errors, [])
})

test('should render the actual failure reason', () => {
  const { errors, infos, report } = createReport()

  reportProjectGeneration(report, {
    status: 'failed',
    changes: [],
    failure: {
      code: 'project-scaffolding-failed',
      message: 'Collection metadata is invalid',
    },
  })

  assert.deepEqual(errors, ['Collection metadata is invalid'])
  assert.deepEqual(infos, [])
})

test('should report a current scaffold without fabricating changes', () => {
  const { errors, infos, report } = createReport()

  reportProjectGeneration(report, { status: 'generated', changes: [] })

  assert.deepEqual(infos, ['Project scaffold is already current'])
  assert.deepEqual(errors, [])
})
