import assert                                 from 'node:assert/strict'
import { rm }                                 from 'node:fs/promises'
import { test }                               from 'node:test'

import { npath }                              from '@yarnpkg/fslib'

import { create as createExecutor }           from '../executor.js'
import { assert as assertCompleted }          from './completion.js'
import { program }                            from './fixtures/paths.js'
import { get as getProject }                  from './project.js'
import { track as trackTemporaryDirectories } from './temporary.js'

test('should cancel execution and remove its temporary directory', async (context) => {
  const { project } = await getProject()
  const removed = trackTemporaryDirectories(context)
  const executor = createExecutor({ project })
  const result = await executor.execute({
    arguments: ['wait'],
    cancelSignal: AbortSignal.timeout(50),
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program,
  })

  assert.equal(result.reason, 'cancelled')
  assert.equal(removed.length, 1)
})

test('should time out execution and remove its temporary directory', async (context) => {
  const { project } = await getProject()
  const removed = trackTemporaryDirectories(context)
  const executor = createExecutor({ project })
  const result = await executor.execute({
    arguments: ['wait'],
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program,
    timeoutMs: 50,
  })

  assert.equal(result.reason, 'timed-out')
  assert.equal(removed.length, 1)
})

test(
  'should preserve signal termination and remove its temporary directory',
  { skip: process.platform === 'win32' },
  async (context) => {
    const { project } = await getProject()
    const removed = trackTemporaryDirectories(context)
    const executor = createExecutor({ project })
    const result = await executor.execute({
      arguments: ['signal'],
      cwd: npath.fromPortablePath(project.cwd),
      input: 'ignore',
      output: { mode: 'capture' },
      program,
    })

    assert.equal(result.reason, 'signalled')
    assert.equal(result.signal, 'SIGTERM')
    assert.equal(removed.length, 1)
  }
)

test('should wait for captured output before completing', async () => {
  const { project } = await getProject()
  const executor = createExecutor({ project })
  const result = await executor.execute({
    arguments: ['stream'],
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program,
  })

  assertCompleted(result)
  assert.equal(result.stdout.length, 256 * 1024)
})

test('should return an output failure when the application handler throws', async (context) => {
  const { project } = await getProject()
  const removed = trackTemporaryDirectories(context)
  const executor = createExecutor({ project })
  const result = await executor.execute({
    arguments: ['report', 'unused'],
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: {
      mode: 'handle',
      handler: () => {
        throw new Error('handler failed')
      },
    },
    program,
  })

  assert.deepEqual(result, {
    reason: 'output-failed',
    exitCode: 0,
    failure: {
      code: 'output-failed',
      message: 'Managed Node output handling failed',
    },
    stderr: '',
    stdout: '',
  })
  assert.equal(removed.length, 1)
})

test('should preserve a non-zero exit when the application handler throws', async (context) => {
  const { project } = await getProject()
  const removed = trackTemporaryDirectories(context)
  const executor = createExecutor({ project })
  const result = await executor.execute({
    arguments: ['write-and-fail'],
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: {
      mode: 'handle',
      handler: () => {
        throw new Error('handler failed')
      },
    },
    program,
  })

  assert.deepEqual(result, {
    reason: 'output-failed',
    exitCode: 7,
    failure: {
      code: 'output-failed',
      message: 'Managed Node output handling failed',
    },
    stderr: '',
    stdout: '',
  })
  assert.equal(removed.length, 1)
})

test('should report cleanup failure without discarding the process result', async (context) => {
  const { project } = await getProject()
  const removed = trackTemporaryDirectories(context, new Error('cleanup failed'))
  const executor = createExecutor({ project })
  const result = await executor.execute({
    arguments: ['fail'],
    cwd: npath.fromPortablePath(project.cwd),
    input: 'ignore',
    output: { mode: 'capture' },
    program,
  })

  assert.deepEqual(result, {
    reason: 'cleanup-failed',
    failure: {
      code: 'cleanup-failed',
      message: 'Managed Node temporary resource cleanup failed',
    },
    execution: {
      reason: 'completed',
      exitCode: 7,
      stderr: '',
      stdout: '',
    },
  })
  assert.equal(removed.length, 1)
  await rm(removed[0], { force: true, recursive: true })
})
