import assert            from 'node:assert/strict'
import { test }          from 'node:test'

import { render }        from 'ink-testing-library'
import React             from 'react'
import stripAnsi         from 'strip-ansi'

import { SourcePreview } from './source-preview.component.jsx'

test('should render source preview', () => {
  const { lastFrame } = render(
    <SourcePreview line={1} column={1} message='Test'>
      {`import assert            from 'node:assert/strict'
import { test }          from 'node:test'

import { render }        from 'ink-testing-library'
import React             from 'react'`}
    </SourcePreview>
  )

  assert.equal(
    stripAnsi(lastFrame()!), // eslint-disable-line @typescript-eslint/no-non-null-assertion
    `> 1 | import assert            from 'node:assert/strict'
    | ^ Test
  2 | import { test }          from 'node:test'
  3 |
  4 | import { render }        from 'ink-testing-library'`
  )
})
