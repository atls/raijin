import type { MessageName }         from '@yarnpkg/core'

import assert                       from 'node:assert/strict'
import { PassThrough }              from 'node:stream'
import { test }                     from 'node:test'

import { Configuration }            from '@yarnpkg/core'
import { npath }                    from '@yarnpkg/fslib'

import { presentProjectGeneration } from './project.js'
import { reportProjectGeneration }  from './project.js'

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

test('should return a native nonzero report for an unsupported scaffold type', async (context) => {
  const configuration = Configuration.create(npath.toPortablePath(import.meta.dirname))
  const stdout = new PassThrough()
  const output: Array<Buffer> = []
  const message = 'Unsupported project scaffold type "service". Expected one of: library, project.'

  context.after(() => stdout.destroy())
  stdout.on('data', (data: Buffer) => output.push(data))

  assert.equal(
    await presentProjectGeneration({ stdout }, configuration, {
      status: 'rejected',
      failure: { code: 'unsupported-project-scaffold-type', message },
    }),
    1
  )
  assert.ok(Buffer.concat(output).toString().includes(message))
})
