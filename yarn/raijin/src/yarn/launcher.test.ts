import assert                            from 'node:assert/strict'
import { delimiter }                     from 'node:path'
import { test }                          from 'node:test'

import { createLauncherBaseEnvironment } from './launcher.js'

test('should isolate nested Yarn commands from dlx launcher environment', () => {
  assert.deepEqual(
    createLauncherBaseEnvironment({
      BERRY_BIN_FOLDER: '/private/tmp/xfs-123',
      INIT_CWD: '/private/tmp/dlx-123',
      NODE_OPTIONS:
        '--require /private/tmp/dlx-123/.pnp.cjs --experimental-loader file:///private/tmp/dlx-123/.pnp.loader.mjs --trace-warnings --loader file:///tmp/custom-loader.mjs',
      PATH: ['/private/tmp/xfs-123', '/usr/local/bin', '/usr/bin'].join(delimiter),
      PROJECT_CWD: '/private/tmp/dlx-123',
      npm_config_user_agent: 'yarn/4.14.1',
      npm_execpath: '/private/tmp/xfs-123/yarn',
    }),
    {
      INIT_CWD: '/private/tmp/dlx-123',
      NODE_OPTIONS: '--trace-warnings --loader file:///tmp/custom-loader.mjs',
      PATH: ['/usr/local/bin', '/usr/bin'].join(delimiter),
      PROJECT_CWD: '/private/tmp/dlx-123',
    }
  )
})

test('should remove node options when they only contain launcher PnP state', () => {
  assert.deepEqual(
    createLauncherBaseEnvironment({
      NODE_OPTIONS:
        '--require=/private/tmp/dlx-123/.pnp.cjs --experimental-loader=file:///private/tmp/dlx-123/.pnp.loader.mjs',
    }),
    {}
  )
})

test('should preserve quoted node options unrelated to the launcher PnP state', () => {
  assert.deepEqual(
    createLauncherBaseEnvironment({
      NODE_OPTIONS:
        '--require "/private/tmp/dlx path/.pnp.cjs" --experimental-loader "file:///private/tmp/dlx path/.pnp.loader.mjs" --trace-warnings --loader "file:///tmp/custom loader.mjs"',
    }),
    {
      NODE_OPTIONS: '--trace-warnings --loader "file:///tmp/custom loader.mjs"',
    }
  )
})
