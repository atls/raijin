import assert                           from 'node:assert/strict'
import test                             from 'node:test'

import { createStartServerForkOptions } from '../src/start-server.plugin.js'

test('should keep default silent fork options', () => {
  assert.deepEqual(createStartServerForkOptions({}), {
    silent: true,
  })
})

test('should pass runtime exec argv to fork options', () => {
  assert.deepEqual(
    createStartServerForkOptions({
      execArgv: ['--loader', 'file:///repo/.pnp.loader.mjs'],
    }),
    {
      silent: true,
      execArgv: ['--loader', 'file:///repo/.pnp.loader.mjs'],
    }
  )
})
