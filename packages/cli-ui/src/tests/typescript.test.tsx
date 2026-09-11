import assert                   from 'node:assert/strict'
import { test }                 from 'node:test'

import { ScriptTarget }         from 'typescript'
import { createSourceFile }     from 'typescript'
import React                    from 'react'
import stripAnsi                from 'strip-ansi'

import { TypeScriptDiagnostic } from '../index.js'
import { renderStatic }         from '../index.js'

test('renders compiler and structured diagnostics identically', () => {
  const sourceText = 'const value: string = 1\n'
  const message = "Type 'number' is not assignable to type 'string'"
  const file = createSourceFile('/workspace/src/example.ts', sourceText, ScriptTarget.Latest, true)
  const compilerOutput = stripAnsi(
    renderStatic(
      <TypeScriptDiagnostic
        code={2322}
        cwd='/workspace'
        file={file}
        messageText={message}
        start={0}
      />
    )
  )
  const structuredOutput = stripAnsi(
    renderStatic(
      <TypeScriptDiagnostic
        code={2322}
        column={1}
        cwd='/workspace'
        file='/workspace/src/example.ts'
        line={1}
        message={message}
        sourceText={sourceText}
      />
    )
  )

  assert.equal(structuredOutput, compilerOutput)
  assert.match(structuredOutput, /src\/example\.ts:1:1/u)
  assert.match(structuredOutput, /> 1 \| const value: string = 1/u)
  assert.match(structuredOutput, /TS2322/u)
  assert.match(structuredOutput, /Type 'number' is not assignable to type 'string'/u)
})
