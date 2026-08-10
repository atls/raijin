import assert        from 'node:assert/strict'
import { delimiter } from 'node:path'
import { win32 }     from 'node:path'
import { test }      from 'node:test'

import { sanitize }  from './sanitize.js'

test('should canonicalize Windows environment and remove the inherited Yarn bin folder', () => {
  const environment = sanitize(
    {
      Berry_Bin_Folder: 'C:\\xfs-launcher',
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

test('should remove Yarn-owned variables without consuming bootstrap markers', () => {
  const environment = sanitize(
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

test('should preserve unrelated temporary paths', () => {
  assert.deepEqual(
    sanitize(
      {
        BERRY_BIN_FOLDER: '/tmp/xfs-owned',
        PATH: ['/tmp/xfs-other', '/tmp/xfs-owned', '/usr/bin'].join(delimiter),
      },
      'linux'
    ),
    { PATH: ['/tmp/xfs-other', '/usr/bin'].join(delimiter) }
  )
})

test('should preserve case-sensitive environment names on POSIX', () => {
  assert.deepEqual(
    sanitize(
      {
        Node_Options: '--title=lower',
        NODE_OPTIONS: '--title=upper',
        Path: 'custom-path',
        PATH: '/usr/bin',
      },
      'linux'
    ),
    {
      Node_Options: '--title=lower',
      NODE_OPTIONS: '--title=upper',
      Path: 'custom-path',
      PATH: '/usr/bin',
    }
  )
})
