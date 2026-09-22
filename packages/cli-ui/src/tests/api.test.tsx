import assert     from 'node:assert/strict'
import { test }   from 'node:test'

import React      from 'react'
import stripAnsi  from 'strip-ansi'

import * as cliUi from '../index.js'

test('renders an error through the public API', () => {
  const error = new Error('Example failure')
  error.stack = undefined

  assert.match(stripAnsi(cliUi.renderStatic(<cliUi.ErrorInfo error={error} />)), /Example failure/)
})
