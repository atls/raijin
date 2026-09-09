import assert           from 'node:assert/strict'
import { test }         from 'node:test'

import React            from 'react'
import stripAnsi        from 'strip-ansi'

import { StackTrace }   from '../index.js'
import { renderStatic } from '../index.js'

test('renders stack frame locations relative to the requested working directory', () => {
  const output = stripAnsi(
    renderStatic(
      <StackTrace cwd='/workspace'>
        {'Error: Example failure\n    at run (/workspace/src/run.ts:3:5)'}
      </StackTrace>
    )
  )

  assert.match(output, /run/)
  assert.match(output, /src\/run\.ts:3:5/)
})
