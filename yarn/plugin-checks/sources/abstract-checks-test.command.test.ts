import type { TestEvent }  from 'node:test/reporters'

import type { Annotation } from './github.checks.js'

import assert              from 'node:assert/strict'
import { join }            from 'node:path'
import { test }            from 'node:test'

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
