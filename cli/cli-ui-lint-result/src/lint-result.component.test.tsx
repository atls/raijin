import assert         from 'node:assert/strict'
import { test }       from 'node:test'

import { render }     from 'ink-testing-library'
import React          from 'react'
import stripAnsi      from 'strip-ansi'

import { LintResult } from './lint-result.component.jsx'

test('should render lint result', () => {
  const { lastFrame } = render(
    <LintResult
      filePath='cli-ui/cli-ui-lint-result/src/lint-result.component.test.tsx'
      source={`import assert            from 'node:assert/strict'
import { test }          from 'node:test'

import { render }        from 'ink-testing-library'
import React             from 'react'
`}
      messages={[
        {
          ruleId: 'some',
          message: 'some message',
          line: 1,
          column: 1,
        },
      ]}
    />
  )

  assert.equal(
    stripAnsi(lastFrame()!),
    `╭──────────────────────────────────────────────────────────────────────────────────────────────────╮
│                                                                                                  │
│  cli-ui/cli-ui-lint-result/src/lint-result.component.test.tsx:1:1                          some  │
│                                                                                                  │
│> 1 | import assert            from 'node:assert/strict'                                          │
│    | ^                                                                                           │
│  2 | import { test }          from 'node:test'                                                   │
│  3 |                                                                                             │
│  4 | import { render }        from 'ink-testing-library'                                         │
│                                                                                                  │
│   some message                                                                                   │
│                                                                                                  │
╰──────────────────────────────────────────────────────────────────────────────────────────────────╯`
  )
})
