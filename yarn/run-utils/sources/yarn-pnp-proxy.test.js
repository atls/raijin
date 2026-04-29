import assert from 'node:assert/strict'
import { delimiter } from 'node:path'
import { resolve } from 'node:path'
import { test } from 'node:test'

import { COMMAND_PROXY_EXECUTION } from './yarn-pnp-proxy.js'
import { NATIVE_NODE_PATH } from './yarn-pnp-proxy.js'
import { getNativeNodeCandidates } from './yarn-pnp-proxy.js'
import { hasPnpLoaders } from './yarn-pnp-proxy.js'
import { isRosettaRuntime } from './yarn-pnp-proxy.js'
import { isYarnPnpRegularRuntime } from './yarn-pnp-proxy.js'
import { resolveNativeArm64NodePath } from './yarn-pnp-proxy.js'

test('should detect yarn pnp regular runtime', () => {
  assert.equal(
    hasPnpLoaders('--require /repo/.pnp.cjs --loader file:///repo/.pnp.loader.mjs'),
    true
  )
  assert.equal(hasPnpLoaders('--require /repo/.pnp.cjs'), false)
  assert.equal(isYarnPnpRegularRuntime({ NODE_OPTIONS: '--require /repo/.pnp.cjs' }), false)
  assert.equal(
    isYarnPnpRegularRuntime({
      [COMMAND_PROXY_EXECUTION]: 'true',
    }),
    true
  )
})

test('should detect Rosetta runtime only for translated darwin x64 process', () => {
  assert.equal(isRosettaRuntime({ platform: 'darwin', arch: 'x64', translated: true }), true)
  assert.equal(isRosettaRuntime({ platform: 'darwin', arch: 'arm64', translated: true }), false)
  assert.equal(isRosettaRuntime({ platform: 'linux', arch: 'x64', translated: true }), false)
  assert.equal(isRosettaRuntime({ platform: 'darwin', arch: 'x64', translated: false }), false)
})

test('should prefer explicit and nvm node candidates before path fallbacks', () => {
  const env = {
    [NATIVE_NODE_PATH]: '/custom/bin/node',
    NVM_BIN: '/Users/user/.nvm/versions/node/v24.11.1/bin',
    PATH: ['/usr/local/bin', '/opt/homebrew/bin'].join(delimiter),
  }

  assert.deepEqual(getNativeNodeCandidates(env, '/usr/local/bin/node').slice(0, 3), [
    resolve('/custom/bin/node'),
    resolve('/Users/user/.nvm/versions/node/v24.11.1/bin/node'),
    resolve('/opt/homebrew/bin/node'),
  ])
})

test('should resolve first arm64 node candidate', () => {
  const env = {
    PATH: ['/x64/bin', '/arm/bin'].join(delimiter),
  }

  const resolved = resolveNativeArm64NodePath({
    env,
    execPath: '/current/bin/node',
    inspectNodeArchitecture: (nodePath) => (nodePath.includes('/arm/') ? 'arm64' : 'x64'),
  })

  assert.equal(resolved, resolve('/arm/bin/node'))
})
