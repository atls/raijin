import type { MessageName }           from '@yarnpkg/core'

import assert                         from 'node:assert/strict'
import { PassThrough }                from 'node:stream'
import { test }                       from 'node:test'

import { Configuration }              from '@yarnpkg/core'
import { npath }                      from '@yarnpkg/fslib'

import { presentIconGeneration }      from '../icons.js'
import { presentIconGenerationError } from '../icons.js'
import { reportIconGeneration }       from '../icons.js'

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

const createConfiguration = async () => Configuration.create(npath.toPortablePath(process.cwd()))

test('should report generated icon artifacts without an error', () => {
  const { errors, infos, report } = createReport()

  reportIconGeneration(report, {
    files: ['src/Alert.icon.tsx', 'src/index.ts'],
    status: 'generated',
  })

  assert.deepEqual(infos, ['Generated 2 icon artifacts'])
  assert.deepEqual(errors, [])
})

test('should report duplicate components and preserve format or lint failure exit details', () => {
  const { errors, infos, report } = createReport()

  reportIconGeneration(report, {
    components: ['AlertIcon', 'BellIcon'],
    reason: 'duplicate-components',
    status: 'rejected',
  })
  reportIconGeneration(report, {
    exitCode: 23,
    files: ['src/Alert.icon.tsx', 'src/index.ts'],
    reason: 'format-failed',
    status: 'failed',
  })
  reportIconGeneration(report, {
    exitCode: 31,
    files: ['src/Alert.icon.tsx', 'src/index.ts'],
    reason: 'lint-failed',
    status: 'failed',
  })

  assert.deepEqual(errors, [
    'Duplicate icon components: AlertIcon, BellIcon',
    'Format failed with exit code 23',
    'Lint failed with exit code 31',
  ])
  assert.deepEqual(infos, [])
})

test('should preserve result exit codes and report provider exceptions as command failures', async () => {
  const configuration = await createConfiguration()
  const context = { stdout: new PassThrough() }

  assert.equal(
    await presentIconGeneration(context, configuration, {
      files: ['src/Alert.icon.tsx', 'src/index.ts'],
      status: 'generated',
    }),
    0
  )
  assert.equal(
    await presentIconGeneration(context, configuration, {
      components: ['AlertIcon'],
      reason: 'duplicate-components',
      status: 'rejected',
    }),
    1
  )
  assert.equal(
    await presentIconGeneration(context, configuration, {
      exitCode: 23,
      files: ['src/Alert.icon.tsx', 'src/index.ts'],
      reason: 'format-failed',
      status: 'failed',
    }),
    23
  )
  assert.equal(
    await presentIconGeneration(context, configuration, {
      exitCode: 31,
      files: ['src/Alert.icon.tsx', 'src/index.ts'],
      reason: 'lint-failed',
      status: 'failed',
    }),
    31
  )
  assert.equal(
    await presentIconGenerationError(context, configuration, new Error('SVGR unavailable')),
    1
  )
})
