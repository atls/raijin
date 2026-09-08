import assert     from 'node:assert/strict'
import { test }   from 'node:test'

import React      from 'react'
import stripAnsi  from 'strip-ansi'

import * as cliUi from './index.js'

test('should expose the shared CLI presentation entrypoints', () => {
  assert.deepEqual(Object.keys(cliUi).sort(), [
    'ErrorInfo',
    'StackTrace',
    'TypeScriptDiagnostic',
    'renderStatic',
  ])
})

test('should render an error through the shared entrypoint', () => {
  const error = new Error('Example failure')
  error.stack = undefined

  assert.match(stripAnsi(cliUi.renderStatic(<cliUi.ErrorInfo error={error} />)), /Example failure/)
})
