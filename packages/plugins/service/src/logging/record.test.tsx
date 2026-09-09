import assert           from 'node:assert/strict'
import { test }         from 'node:test'

import React            from 'react'
import stripAnsi        from 'strip-ansi'

import { renderStatic } from '@atls/cli-ui'

import { LogRecord }    from './record.js'

test('renders established service log attributes', () => {
  const output = stripAnsi(
    renderStatic(
      <LogRecord
        body='Request failed'
        attributes={{
          '@namespace': 'service:api',
          '@stack': 'Error: Request failed\n    at run (/workspace/src/run.ts:3:5)',
          '@mikro-orm-sql': 'select * from users where id = ?',
          '@mikro-orm-params': ['42'],
        }}
      />
    )
  )

  assert.match(output, /service:api/)
  assert.match(output, /Request failed/)
  assert.match(output, /run/)
  assert.match(output, /SQL:/)
  assert.match(output, /42/)
})
