import assert          from 'node:assert/strict'
import { test }        from 'node:test'

import { render }      from 'ink-testing-library'
import React           from 'react'
import stripAnsi       from 'strip-ansi'

import { TestFailure } from './test-failure.component.jsx'

test('should render test failure', () => {
  const { lastFrame } = render(
    <TestFailure
      file='cli-ui/cli-ui-test-failure/src/test-failure.component.test.tsx'
      source={`import assert            from 'node:assert/strict'
import { test }          from 'node:test'

import { render }        from 'ink-testing-library'
import React             from 'react'
`}
      details={{
        error: new Error('Test failure'),
      }}
    />
  )

  assert.equal(
    stripAnsi(lastFrame()!),
    `╭──────────────────────────────────────────────────────────────────────────────────────────────────╮
│                                                                                                  │
│  cli-ui/cli-ui-test-failure/src/test-failure.component.test.tsx:0:0                              │
│                                                                                                  │
│> 1 | import assert            from 'node:assert/strict'                                          │
│    | ^                                                                                           │
│  2 | import { test }          from 'node:test'                                                   │
│  3 |                                                                                             │
│  4 | import { render }        from 'ink-testing-library'                                         │
│                                                                                                  │
│                                                                                                  │
│  Test failure                                                                                    │
│                                                                                                  │
╰──────────────────────────────────────────────────────────────────────────────────────────────────╯`
  )
})
