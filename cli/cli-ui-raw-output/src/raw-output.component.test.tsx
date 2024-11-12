import assert        from 'node:assert/strict'
import { test }      from 'node:test'

import { render }    from 'ink-testing-library'
import React         from 'react'
import stripAnsi     from 'strip-ansi'

import { RawOutput } from './raw-output.component.jsx'

test('should render raw output', () => {
  const { lastFrame } = render(
    <RawOutput
      file='cli-ui/cli-ui-test-failure/src/test-failure.component.test.tsx'
      messages={['Some message one', 'Some message two']}
    />
  )

  assert.equal(
    stripAnsi(lastFrame()!), // eslint-disable-line @typescript-eslint/no-non-null-assertion
    `┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                                  │
│  cli-ui/cli-ui-test-failure/src/test-failure.component.test.tsx:0:0                              │
│                                                                                                  │
│                                                                                                  │
│  Some message one                                                                                │
│  Some message two                                                                                │
│                                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘`
  )
})
