import assert                   from 'node:assert/strict'
import { test }                 from 'node:test'

import { ScriptTarget }         from 'typescript'
import { createSourceFile }     from 'typescript'
import React                    from 'react'
import stripAnsi                from 'strip-ansi'

import { TypeScriptDiagnostic } from '../index.js'
import { renderStatic }         from '../index.js'

test('renders a diagnostic at the first source character with one-based coordinates', () => {
  const file = createSourceFile(
    '/workspace/src/example.ts',
    'const value: string = 1\n',
    ScriptTarget.Latest,
    true
  )
  const output = stripAnsi(
    renderStatic(
      <TypeScriptDiagnostic
        code={2322}
        cwd='/workspace'
        file={file}
        messageText="Type 'number' is not assignable to type 'string'"
        start={0}
      />
    )
  )

  assert.match(output, /src\/example\.ts:1:1/)
  assert.match(output, /> 1 \| const value: string = 1/)
  assert.match(output, /─{10}/)
  assert.match(output, /TS2322/)
  assert.match(output, /Type 'number' is not assignable to type 'string'/)
})
