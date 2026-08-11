import assert                            from 'node:assert/strict'
import { delimiter }                     from 'node:path'
import { test }                          from 'node:test'

import { createLauncherBaseEnvironment } from './launcher.js'

test('should remove exact inherited launcher state', () => {
  const registration = '--import file:///private/tmp/raijin-registration.mjs'

  assert.deepEqual(
    createLauncherBaseEnvironment({
      BERRY_BIN_FOLDER: '/private/tmp/xfs-123',
      INIT_CWD: '/private/tmp/dlx-123',
      NODE_OPTIONS: `--trace-warnings ${registration} --loader file:///tmp/custom-loader.mjs`,
      PATH: ['/private/tmp/xfs-123', '/usr/local/bin', '/usr/bin'].join(delimiter),
      PROJECT_CWD: '/private/tmp/dlx-123',
      RAIJIN_NODE_LOADER: 'file:///tmp/typescript-loader.mjs',
      RAIJIN_NODE_LOADER_REGISTRATION: registration,
      RAIJIN_REGISTERED_PNP_LOADER: 'file:///repo/.pnp.loader.mjs',
      npm_config_user_agent: 'yarn/4.14.1',
      npm_execpath: '/private/tmp/xfs-123/yarn',
      npm_node_execpath: '/usr/local/bin/node',
    }),
    {
      INIT_CWD: '/private/tmp/dlx-123',
      NODE_OPTIONS: '--trace-warnings --loader file:///tmp/custom-loader.mjs',
      PATH: ['/usr/local/bin', '/usr/bin'].join(delimiter),
      PROJECT_CWD: '/private/tmp/dlx-123',
      RAIJIN_NODE_LOADER: 'file:///tmp/typescript-loader.mjs',
    }
  )
})

test('should preserve foreign PnP options and unrelated temporary paths', () => {
  const nodeOptions =
    '--require /private/tmp/dlx-123/.pnp.cjs --experimental-loader file:///private/tmp/dlx-123/.pnp.loader.mjs --trace-warnings'
  const path = ['/private/tmp/xfs-other', '/usr/bin'].join(delimiter)

  assert.deepEqual(
    createLauncherBaseEnvironment({
      BERRY_BIN_FOLDER: '/private/tmp/xfs-owned',
      NODE_OPTIONS: nodeOptions,
      PATH: path,
    }),
    { NODE_OPTIONS: nodeOptions, PATH: path }
  )
})

test('should preserve an unrecorded matching registration', () => {
  const registration = '--import file:///private/tmp/raijin-registration.mjs'

  assert.deepEqual(createLauncherBaseEnvironment({ NODE_OPTIONS: registration }), {
    NODE_OPTIONS: registration,
  })
})

test(
  'should canonicalize exact launcher environment state on Windows',
  { skip: process.platform !== 'win32' },
  () => {
    assert.deepEqual(
      createLauncherBaseEnvironment({
        Berry_Bin_Folder: 'C:\\XFS-Launcher',
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
