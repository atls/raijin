import assert                        from 'node:assert/strict'
import { test }                      from 'node:test'

import { npath }                     from '@yarnpkg/fslib'

import { assertCompleted }           from './assert-completed.js'
import { compose }                   from './compose.js'
import { createProjectContext }      from './create-project-context.js'
import { resolveFixturePath }        from './resolve-fixture-path.js'
import { trackTemporaryDirectories } from './track-temporary-directories.js'

const entry = resolveFixturePath('entry.ts')

test('should execute a relative entry whose name starts with an option prefix', async (context) => {
  const { project } = await createProjectContext()
  const removed = trackTemporaryDirectories(context)
  const executor = compose({ project })
  const result = await executor.execute({
    arguments: ['argument-value'],
    cwd: resolveFixturePath(),
    input: 'ignore',
    output: { mode: 'capture' },
    entry: '-entry.ts',
  })

  assertCompleted(result)
  assert.equal(result.exitCode, 0, result.stderr)
  assert.equal(result.stdout, 'argument-value')
  assert.equal(removed.length, 1)
})

test('should preserve a non-zero exit as a completed execution', async (context) => {
  const { project } = await createProjectContext()
  const removed = trackTemporaryDirectories(context)
  const executor = compose({ project })
  const result = await executor.execute({
    arguments: ['fail'],
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    entry,
  })

  assertCompleted(result)
  assert.equal(result.exitCode, 7)
  assert.equal(removed.length, 1)
})

test('should expose output through the application handler contract', async () => {
  const { project } = await createProjectContext()
  const events: Array<{ data: string; source: 'stderr' | 'stdout' }> = []
  const executor = compose({ project })
  const result = await executor.execute({
    arguments: ['report', 'handled-value'],
    cwd: npath.fromPortablePath(project.cwd),
    environment: { RAIJIN_TEST_VALUE: 'handled-environment' },
    input: 'ignore',
    output: { mode: 'handle', handler: (event) => events.push(event) },
    entry,
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

test('should preserve a Node-reported missing entry as a completed non-zero exit', async () => {
  const { project } = await createProjectContext()
  const executor = compose({ project })
  const result = await executor.execute({
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    entry: resolveFixturePath('missing.ts'),
  })

  assert.equal(result.reason, 'completed')
  assert.notEqual(result.exitCode, 0)
})
