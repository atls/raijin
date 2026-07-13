import assert                     from 'node:assert/strict'
import test                       from 'node:test'

import { INVOCATION_CWD_ENV }     from './resolve.js'
import { PROXY_ENV }              from './resolve.js'
import { createProxyEnvironment } from './proxy.js'
import { shouldProxyCommand }     from './proxy.js'

test('should proxy before the managed PnP runtime is active', () => {
  assert.equal(shouldProxyCommand({}), true)
})

test('should not proxy after proxy re-entry', () => {
  assert.equal(shouldProxyCommand({ [PROXY_ENV]: 'true' }), false)
})

test('should proxy when loader options exist without a Raijin re-entry marker', () => {
  assert.equal(
    shouldProxyCommand({
      NODE_OPTIONS: '--require ./.pnp.cjs --experimental-loader file:///.pnp.loader.mjs',
    }),
    true
  )
})

test('should preserve invocation cwd across proxy re-entry', () => {
  const environment = createProxyEnvironment('/repo/client' as never, {
    NODE_ENV: 'test',
  })

  assert.equal(environment[PROXY_ENV], 'true')
  assert.equal(environment[INVOCATION_CWD_ENV], '/repo/client')
  assert.equal(environment.NODE_ENV, 'test')
})
