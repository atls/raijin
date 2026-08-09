import assert                                 from 'node:assert/strict'
import { join }                               from 'node:path'
import { test }                               from 'node:test'

import { npath }                              from '@yarnpkg/fslib'

import { create as createExecutor }           from '../executor.js'
import { assert as assertCompleted }          from './completion.js'
import { directory as fixturesDirectory }     from './fixtures/paths.js'
import { program }                            from './fixtures/paths.js'
import { get as getProject }                  from './project.js'
import { track as trackTemporaryDirectories } from './temporary.js'

test('should execute a relative program whose name starts with an option prefix', async (context) => {
  const { project } = await getProject()
  const removed = trackTemporaryDirectories(context)
  const executor = createExecutor({ project })
  const result = await executor.execute({
    arguments: ['argument-value'],
    cwd: fixturesDirectory,
    input: 'ignore',
    output: { mode: 'capture' },
    program: '-program.ts',
  })

  assertCompleted(result)
  assert.equal(result.exitCode, 0, result.stderr)
  assert.equal(result.stdout, 'argument-value')
  assert.equal(removed.length, 1)
})

test('should preserve a non-zero exit as a completed execution', async (context) => {
  const { project } = await getProject()
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
  const { project } = await getProject()
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
  const { project } = await getProject()
  const executor = createExecutor({ project })
  const result = await executor.execute({
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program: join(fixturesDirectory, 'missing.ts'),
  })

  assert.equal(result.reason, 'completed')
  assert.notEqual(result.exitCode, 0)
})
