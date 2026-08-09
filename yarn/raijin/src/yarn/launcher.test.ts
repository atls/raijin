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

test('should remove process-local loader registration state', () => {
  assert.deepEqual(
    createLauncherBaseEnvironment({
      RAIJIN_NODE_LOADER: 'file:///tmp/typescript-loader.mjs',
      RAIJIN_REGISTERED_PNP_LOADER: 'file:///repo/.pnp.loader.mjs',
    }),
    {
      RAIJIN_NODE_LOADER: 'file:///tmp/typescript-loader.mjs',
    }
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

test(
  'should canonicalize mixed-case launcher environment on Windows',
  { skip: process.platform !== 'win32' },
  () => {
    assert.deepEqual(
      createLauncherBaseEnvironment({
        Berry_Bin_Folder: 'C:\\xfs-launcher',
        Node_Options: '--trace-warnings',
        Path: ['C:\\xfs-launcher', 'C:\\Windows'].join(delimiter),
        Yarn_Ignore_Path: '1',
      }),
      {
        NODE_OPTIONS: '--trace-warnings',
        PATH: 'C:\\Windows',
      }
    )
  }
)
