import assert                           from 'node:assert/strict'
import { delimiter }                    from 'node:path'
import { test }                         from 'node:test'

import { createYarnCommandEnvironment } from './command.js'

test('should allow nested yarn commands to follow configured yarnPath', () => {
  assert.deepEqual(
    createYarnCommandEnvironment('/repo/package', { FOO: 'bar', YARN_IGNORE_PATH: '1' }),
    {
      FOO: 'bar',
      INIT_CWD: '/repo/package',
      PROJECT_CWD: '/repo/package',
    }
  )
})

test('should isolate nested yarn commands from dlx launcher environment', () => {
  assert.deepEqual(
    createYarnCommandEnvironment('/repo/package', {
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
      INIT_CWD: '/repo/package',
      NODE_OPTIONS: '--trace-warnings --loader file:///tmp/custom-loader.mjs',
      PATH: ['/usr/local/bin', '/usr/bin'].join(delimiter),
      PROJECT_CWD: '/repo/package',
    }
  )
})

test('should remove node options when they only contain dlx pnp loader state', () => {
  assert.deepEqual(
    createYarnCommandEnvironment('/repo/package', {
      NODE_OPTIONS:
        '--require=/private/tmp/dlx-123/.pnp.cjs --experimental-loader=file:///private/tmp/dlx-123/.pnp.loader.mjs',
    }),
    {
      INIT_CWD: '/repo/package',
      PROJECT_CWD: '/repo/package',
    }
  )
})
