import assert                 from 'node:assert/strict'
import { test }               from 'node:test'

import { createCommandInput } from '@atls/raijin/commands'
import { toPortableCwd }      from '@atls/raijin/commands'

import { runFormatCommand }   from './format.command.jsx'

test('should map explicit targets and successful results to command completion', async () => {
  const cwd = '/repo'
  const targets = createCommandInput({
    cwd: toPortableCwd(cwd),
    source: 'explicit',
    targets: ['src/index.ts'],
  })
  let received

  const outcome = await runFormatCommand(
    { cwd, targets, workspacePackageNames: ['@scope/project'] },
    async (options) => {
      received = options

      return { files: [{ file: 'src/index.ts', status: 'changed' }] }
    }
  )

  assert.deepEqual(received, { cwd, targets, workspacePackageNames: ['@scope/project'] })
  assert.deepEqual(outcome, {
    result: { files: [{ file: 'src/index.ts', status: 'changed' }] },
    status: 'succeeded',
  })
})

test('should map targetless input and operation failures', async () => {
  const cwd = '/repo'
  const targets = createCommandInput({
    cwd: toPortableCwd(cwd),
    source: 'explicit',
    targets: [],
  })
  const failure = new Error('configuration failed')
  let received

  const outcome = await runFormatCommand({ cwd, targets, workspacePackageNames: [] }, async (
    options
  ) => {
    received = options
    throw failure
  })

  assert.deepEqual(received, { cwd, targets: undefined, workspacePackageNames: [] })
  assert.deepEqual(outcome, { error: failure, status: 'failed' })
})
