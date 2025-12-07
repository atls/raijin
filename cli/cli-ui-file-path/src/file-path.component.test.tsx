import assert       from 'node:assert/strict'
import { test }     from 'node:test'

import { render }   from 'ink-testing-library'
import React        from 'react'
import stripAnsi    from 'strip-ansi'

import { FilePath } from './file-path.component.jsx'

test('should render file path', () => {
  const { lastFrame } = render(
    <FilePath line={1} column={1}>
      cli-ui/cli-ui-file-path/src/file-path.component.test.tsx
    </FilePath>
  )

  assert.equal(
    stripAnsi(lastFrame()!),
    'cli-ui/cli-ui-file-path/src/file-path.component.test.tsx:1:1'
  )
})
