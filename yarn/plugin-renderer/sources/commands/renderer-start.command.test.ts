import assert                                    from 'node:assert/strict'
import { test }                                  from 'node:test'

import { RENDERER_STANDALONE_SERVER_ENTRYPOINT } from '../artifact/entrypoint.js'
import { RendererStartCommand }                  from './renderer-start.command.js'

test('should preserve CommonJS extension for Next standalone server entrypoint', () => {
  assert.equal(RENDERER_STANDALONE_SERVER_ENTRYPOINT, 'index.cjs')
})

test('should execute renderer start through its direct execution boundary', async () => {
  let executions = 0
  const command = Object.assign(Object.create(RendererStartCommand.prototype), {
    executeRegular: async () => {
      executions += 1

      return 42
    },
  }) as RendererStartCommand

  assert.equal(await command.execute(), 42)
  assert.equal(executions, 1)
})
