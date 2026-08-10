import assert                        from 'node:assert/strict'
import { test }                      from 'node:test'

import { npath }                     from '@yarnpkg/fslib'

import { create as createExecutor } from '../../../../../src/infrastructure/execution/node/yarn/executor.js'
import { assertCompleted }           from './assert-completed.js'
import { createProjectContext }      from './create-project-context.js'
import { resolveFixturePath }        from './resolve-fixture-path.js'
import { trackTemporaryDirectories } from './track-temporary-directories.js'

const program = resolveFixturePath('managed-node-program.ts')

test('should execute a relative program whose name starts with an option prefix', async (context) => {
  const { project } = await createProjectContext()
  const removed = trackTemporaryDirectories(context)
  const executor = createExecutor({ project })
  const result = await executor.execute({
    arguments: ['argument-value'],
    cwd: resolveFixturePath(),
    input: 'ignore',
    output: { mode: 'capture' },
    program: '-managed-node-program.ts',
  })

  assertCompleted(result)
  assert.equal(result.exitCode, 0, result.stderr)
  assert.equal(result.stdout, 'argument-value')
  assert.equal(removed.length, 1)
})

test('should preserve a non-zero exit as a completed execution', async (context) => {
  const { project } = await createProjectContext()
  const removed = trackTemporaryDirectories(context)
  const executor = createExecutor({ project })
  const result = await executor.execute({
    arguments: ['fail'],
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program,
  })

  assertCompleted(result)
  assert.equal(result.exitCode, 7)
  assert.equal(removed.length, 1)
})

test('should expose output through the application handler contract', async () => {
  const { project } = await createProjectContext()
  const events: Array<{ data: string; source: 'stderr' | 'stdout' }> = []
  const executor = createExecutor({ project })
  const result = await executor.execute({
    arguments: ['report', 'handled-value'],
    cwd: npath.fromPortablePath(project.cwd),
    environment: { RAIJIN_TEST_VALUE: 'handled-environment' },
    input: 'ignore',
    output: { mode: 'handle', handler: (event) => events.push(event) },
    program,
  })

  assertCompleted(result)
  assert.equal(result.stdout, '')
  const report = JSON.parse(
    events
      .filter(({ source }) => source === 'stdout')
      .map(({ data }) => data)
      .join('')
  ) as Record<string, unknown>

  assert.equal(report.argument, 'handled-value')
  assert.equal(report.dependencyLoaded, true)
  assert.equal(report.preserved, 'handled-environment')
})

test('should preserve a Node-reported missing program as a completed non-zero exit', async () => {
  const { project } = await createProjectContext()
  const executor = createExecutor({ project })
  const result = await executor.execute({
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program: resolveFixturePath('missing.ts'),
  })

  assert.equal(result.reason, 'completed')
  assert.notEqual(result.exitCode, 0)
})
