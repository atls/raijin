import type { EventData }  from 'node:test'
import type { TestEvent }  from 'node:test/reporters'

import type { Annotation } from './github.checks.js'

import assert              from 'node:assert/strict'
import { join }            from 'node:path'
import { test }            from 'node:test'

type TestFail = EventData.TestFail

type FormatTestResults = (
  results: Array<TestFail>,
  cwd: string,
  events?: Array<TestEvent>
) => Array<Annotation>

// @ts-expect-error node:test executes TypeScript sources directly in regular mode
const { formatTestResults } = (await import('./test-results.formatter.ts')) as {
  formatTestResults: FormatTestResults
}

const createFailure = (cwd: string, error: Error, overrides: Partial<TestFail> = {}): TestFail => {
  const file = join(cwd, 'client/src/auth/profile.test.ts')

  return {
    name: 'profile auth',
    nesting: 0,
    testNumber: 1,
    details: {
      duration_ms: 1,
      type: 'test',
      error,
    },
    line: 12,
    column: 4,
    file,
    ...overrides,
  } as TestFail
}

test('should include stderr details in loader failure annotation', () => {
  const cwd = '/workspace/project'
  const file = join(cwd, 'client/src/auth/profile.test.ts')
  const error = new Error('test failed')
  const stderr = [
    'node:internal/modules/esm/loader:416\n',
    '      throw new ERR_REQUIRE_CYCLE_MODULE(message);\n',
    '            ^\n',
    'Error [ERR_REQUIRE_CYCLE_MODULE]: Cannot require() ES Module in a cycle\n',
  ]
  const events = stderr.map((message) => ({
    type: 'test:stderr',
    data: {
      file,
      message,
    },
  })) as Array<TestEvent>

  const [annotation] = formatTestResults([createFailure(cwd, error)], cwd, events)

  assert.equal(annotation.path, 'client/src/auth/profile.test.ts')
  assert.equal(annotation.start_line, 12)
  assert.equal(annotation.end_line, 12)
  assert.equal(
    annotation.title,
    'Error [ERR_REQUIRE_CYCLE_MODULE]: Cannot require() ES Module in a cycle'
  )
  assert.match(annotation.raw_details, /ERR_REQUIRE_CYCLE_MODULE/)
})

test('should unwrap non-generic failure cause', () => {
  const cwd = '/workspace/project'
  const cause = new Error('The provided credentials are invalid.')
  cause.stack = 'Error: The provided credentials are invalid.\n    at auth.ts:149:11'

  const error = new Error('test failed', { cause })

  const [annotation] = formatTestResults([createFailure(cwd, error)], cwd)

  assert.equal(annotation.title, 'The provided credentials are invalid.')
  assert.equal(annotation.message, 'The provided credentials are invalid.')
  assert.equal(annotation.raw_details, cause.stack)
})

test('should keep failure-specific details for multiple fails in one file', () => {
  const cwd = '/workspace/project'
  const file = join(cwd, 'client/src/auth/profile.test.ts')
  const firstCause = new Error('First failure reason')
  const secondCause = new Error('Second failure reason')

  firstCause.stack = 'Error: First failure reason\n    at profile.test.ts:12:4'
  secondCause.stack = 'Error: Second failure reason\n    at profile.test.ts:32:4'

  const firstError = new Error('test failed', { cause: firstCause })
  const secondError = new Error('test failed', { cause: secondCause })

  const events = [
    {
      type: 'test:stderr',
      data: {
        file,
        message: 'Error: unrelated merged stderr chunk for first failure\n',
      },
    },
    {
      type: 'test:stderr',
      data: {
        file,
        message: 'Error: unrelated merged stderr chunk for second failure\n',
      },
    },
  ] as Array<TestEvent>

  const annotations = formatTestResults(
    [
      createFailure(cwd, firstError, { name: 'first fail', testNumber: 1, line: 12 }),
      createFailure(cwd, secondError, { name: 'second fail', testNumber: 2, line: 32 }),
    ],
    cwd,
    events
  )

  assert.equal(annotations[0].title, 'First failure reason')
  assert.equal(annotations[0].raw_details, firstCause.stack)
  assert.equal(annotations[1].title, 'Second failure reason')
  assert.equal(annotations[1].raw_details, secondCause.stack)
})

test('should ignore non-error stderr for non-generic failures', () => {
  const cwd = '/workspace/project'
  const file = join(cwd, 'client/src/auth/profile.test.ts')
  const cause = new Error('The provided credentials are invalid.')
  cause.stack = 'Error: The provided credentials are invalid.\n    at auth.ts:149:11'

  const error = new Error('test failed', { cause })
  const events = [
    {
      type: 'test:stderr',
      data: {
        file,
        message: 'diagnostic line from passing test\n',
      },
    },
  ] as Array<TestEvent>

  const [annotation] = formatTestResults([createFailure(cwd, error)], cwd, events)

  assert.equal(annotation.title, 'The provided credentials are invalid.')
  assert.equal(annotation.message, 'The provided credentials are invalid.')
  assert.equal(annotation.raw_details, cause.stack)
})
