import assert                            from 'node:assert/strict'
import test                              from 'node:test'

import { COMMAND_INVOCATION_CWD }        from './proxy-state.js'
import { COMMAND_PROXY_EXECUTION }       from './proxy-state.js'
import { createCommandProxyEnvironment } from './proxy-state.js'
import { shouldExecuteCommandProxy }     from './proxy.js'

test('should proxy before the managed PnP runtime is active', () => {
  assert.equal(shouldExecuteCommandProxy({}), true)
})

test('should not proxy after proxy re-entry', () => {
  assert.equal(shouldExecuteCommandProxy({ [COMMAND_PROXY_EXECUTION]: 'true' }), false)
})

test('should proxy when loader options exist without a Raijin re-entry marker', () => {
  assert.equal(
    shouldExecuteCommandProxy({
      NODE_OPTIONS: '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs',
    }),
    true
  )
})

test('should preserve invocation cwd across proxy re-entry', () => {
  const environment = createCommandProxyEnvironment('/repo/client', {
    NODE_ENV: 'test',
  })

  assert.equal(environment[COMMAND_PROXY_EXECUTION], 'true')
  assert.equal(environment[COMMAND_INVOCATION_CWD], '/repo/client')
  assert.equal(environment.NODE_ENV, 'test')
})
