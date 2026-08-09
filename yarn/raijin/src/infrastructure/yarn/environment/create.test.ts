import assert     from 'node:assert/strict'
import { win32 }  from 'node:path'
import { test }   from 'node:test'

import { create } from './create.js'

test('should canonicalize and deduplicate Windows environment names', () => {
  const environment = create(
    {
      INIT_CWD: 'first-init',
      Init_Cwd: 'last-init',
      NODE_OPTIONS: '--title=first',
      Node_Options: '--title=last',
      PATH: 'first-path',
      Path: ['C:\\xfs-launcher', 'C:\\Windows'].join(win32.delimiter),
      PROJECT_CWD: 'first-project',
      Project_Cwd: 'last-project',
    },
    'win32'
  )

  assert.deepEqual(environment, {
    INIT_CWD: 'last-init',
    NODE_OPTIONS: '--title=last',
    PATH: 'C:\\Windows',
    PROJECT_CWD: 'last-project',
  })
})

test('should remove stale Yarn variables without consuming bootstrap markers', () => {
  const environment = create(
    {
      Berry_Bin_Folder: 'C:\\xfs-launcher',
      NPM_CONFIG_USER_AGENT: 'yarn/4',
      NPM_EXECPATH: 'C:\\xfs-launcher\\yarn.js',
      NPM_NODE_EXECPATH: 'C:\\Program Files\\node.exe',
      Raijin_Registered_Pnp_Loader: 'file:///repo/.pnp.loader.mjs',
      Yarn_Ignore_Path: '1',
    },
    'win32'
  )

  assert.deepEqual(environment, {
    Raijin_Registered_Pnp_Loader: 'file:///repo/.pnp.loader.mjs',
  })
})

test('should preserve case-sensitive environment names on POSIX', () => {
  const environment = create(
    {
      Node_Options: '--title=lower',
      NODE_OPTIONS: '--title=upper',
      Path: 'custom-path',
      PATH: '/usr/bin',
    },
    'linux'
  )

  assert.deepEqual(environment, {
    Node_Options: '--title=lower',
    NODE_OPTIONS: '--title=upper',
    Path: 'custom-path',
    PATH: '/usr/bin',
  })
})
