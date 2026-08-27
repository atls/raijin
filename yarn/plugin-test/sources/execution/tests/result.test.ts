import type { ManagedNodeExecuteResult }    from '@atls/raijin/commands'
import type { EventData }                   from 'node:test'

import type { ProjectTestEvent }            from '../event.js'
import type { TestProducerMessage }         from '../ipc.js'

import assert                               from 'node:assert/strict'
import { test }                             from 'node:test'

import { TEST_EXECUTION_CHANNEL }           from '../ipc.js'
import { createProjectTestOutcome }         from '../result.js'
import { createProjectTestProviderFailure } from '../result.js'
import { createProjectTestResult }          from '../result.js'

const summary = (success: boolean): EventData.TestSummary => ({
  counts: {
    cancelled: 0,
    passed: success ? 1 : 0,
    skipped: 0,
    suites: 0,
    tests: 1,
    todo: 0,
    topLevel: 1,
  },
  duration_ms: 1,
  file: undefined,
  success,
})

const event = (value: ProjectTestEvent): TestProducerMessage => ({
  channel: TEST_EXECUTION_CHANNEL,
  event: value,
  type: 'event',
})

const completed: TestProducerMessage = {
  channel: TEST_EXECUTION_CHANNEL,
  type: 'completed',
}

const execution = (
  messages: Array<TestProducerMessage>,
  overrides: Partial<Extract<ManagedNodeExecuteResult, { reason: 'completed' }>> = {}
): ManagedNodeExecuteResult => ({
  exitCode: 0,
  messages,
  reason: 'completed',
  stderr: '',
  stdout: '',
  ...overrides,
})

test('uses the cumulative Node summary as the pass and fail authority', () => {
  const passed = createProjectTestResult(
    execution([event({ type: 'test:summary', data: summary(true) }), completed])
  )
  const failed = createProjectTestResult(
    execution([event({ type: 'test:summary', data: summary(false) }), completed])
  )

  assert.equal(passed.reason, 'passed')
  assert.equal(passed.state.summary?.success, true)
  assert.equal(failed.reason, 'failed')
  assert.equal(failed.state.summary?.success, false)
})

test('requires an observed Node test:interrupted event for interruption', () => {
  const interrupted = event({
    type: 'test:interrupted',
    data: { tests: [{ name: 'slow test', nesting: 0 }] },
  })
  const observed = createProjectTestResult({
    messages: [interrupted],
    reason: 'signalled',
    signal: 'SIGINT',
    stderr: '',
    stdout: '',
  })
  const unobserved = createProjectTestResult({
    messages: [],
    reason: 'signalled',
    signal: 'SIGINT',
    stderr: '',
    stdout: '',
  })

  assert.equal(observed.reason, 'interrupted')
  assert.equal(observed.state.interrupted[0]?.tests[0]?.name, 'slow test')
  assert.equal(unobserved.reason, 'provider-failed')
})

test('keeps managed cancellation and timeout distinct from observed interruption', () => {
  const messages = [
    event({
      type: 'test:interrupted',
      data: { tests: [{ name: 'slow test', nesting: 0 }] },
    }),
  ]
  const cancelled = createProjectTestResult({
    messages,
    reason: 'cancelled',
    stderr: '',
    stdout: '',
  })
  const timedOut = createProjectTestResult({
    messages,
    reason: 'timed-out',
    stderr: '',
    stdout: '',
  })

  assert.equal(cancelled.reason, 'cancelled')
  assert.equal(timedOut.reason, 'timed-out')
})

test('preserves watch transitions from TestsStream events', () => {
  const result = createProjectTestResult(
    execution([
      event({ type: 'test:watch:drained', data: undefined }),
      event({ type: 'test:watch:restarted', data: undefined }),
      event({ type: 'test:watch:drained', data: undefined }),
      event({ type: 'test:summary', data: summary(true) }),
      completed,
    ])
  )

  assert.deepEqual(result.state.watch, {
    drained: 2,
    lastTransition: 'drained',
    restarted: 1,
  })
})

test('keeps provider, output, and cleanup failures explicit', () => {
  const provider = createProjectTestResult({
    reason: 'start-failed',
    stderr: '',
    stdout: '',
  })
  const output = createProjectTestResult({
    exitCode: 0,
    reason: 'output-failed',
    stderr: '',
    stdout: '',
  })
  const cleanup = createProjectTestResult({
    reason: 'cleanup-failed',
    execution: {
      exitCode: 0,
      messages: [event({ type: 'test:summary', data: summary(true) }), completed],
      reason: 'completed',
      stderr: '',
      stdout: '',
    },
  })

  assert.equal(provider.reason, 'provider-failed')
  assert.deepEqual(provider.detail, {
    message: 'Managed test execution ended with start-failed',
    stage: 'managed-execution',
  })
  assert.equal(output.reason, 'output-failed')
  assert.equal(cleanup.reason, 'cleanup-failed')
  assert.equal(cleanup.state.summary?.success, true)
})

test('keeps expected capability failures non-zero through the shared consumer mapping', () => {
  const discovery = createProjectTestProviderFailure({
    cause: new Error('Test target does not exist: missing.test.ts'),
    providerReason: 'discovery-failed',
    stage: 'discovery',
  })
  const runtime = createProjectTestProviderFailure({
    cause: new Error('Raijin runtime argv provider is unavailable'),
    providerReason: 'runtime-argv-failed',
    stage: 'runtime-argv',
  })

  const cliOutcome = createProjectTestOutcome(discovery)
  const checksOutcome = createProjectTestOutcome(runtime)

  assert.deepEqual(cliOutcome, {
    exitCode: 1,
    summary: 'Test target does not exist: missing.test.ts',
  })
  assert.deepEqual(checksOutcome, {
    exitCode: 1,
    summary: 'Raijin runtime argv provider is unavailable',
  })
})
