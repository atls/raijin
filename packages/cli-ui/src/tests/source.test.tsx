import assert            from 'node:assert/strict'
import { test }          from 'node:test'

import React             from 'react'
import stripAnsi         from 'strip-ansi'

import { SourcePreview } from '../source.js'
import { renderStatic }  from '../index.js'

const COLOR_ENV_KEYS = ['AGENT_NAME', 'CI', 'FORCE_COLOR', 'TEAMCITY_VERSION', 'TERM', 'TF_BUILD']

test('preserves source highlighting for a color-capable destination terminal', () => {
  const environment = new Map(COLOR_ENV_KEYS.map((key) => [key, process.env[key]]))
  const isTTYDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY')

  for (const key of COLOR_ENV_KEYS) {
    Reflect.deleteProperty(process.env, key)
  }

  process.env.TERM = 'xterm-256color'
  Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value: true })

  try {
    const output = renderStatic(
      <SourcePreview line={1} column={1}>
        {'const value = 1\n'}
      </SourcePreview>
    )

    assert.notEqual(output, stripAnsi(output))
    assert.match(stripAnsi(output), /> 1 \| const value = 1/)
  } finally {
    for (const [key, value] of environment) {
      if (value === undefined) {
        Reflect.deleteProperty(process.env, key)
      } else {
        process.env[key] = value
      }
    }

    if (isTTYDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', isTTYDescriptor)
    } else {
      Reflect.deleteProperty(process.stdout, 'isTTY')
    }
  }
})
