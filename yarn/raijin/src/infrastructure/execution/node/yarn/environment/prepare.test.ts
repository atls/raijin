import assert      from 'node:assert/strict'
import { test }    from 'node:test'

import { prepare } from './prepare.js'

const assertUniqueWindowsNames = (environment: NodeJS.ProcessEnv): void => {
  const names = Object.keys(environment).map((name) => name.toUpperCase())

  assert.equal(new Set(names).size, names.length)
}

test('should apply Windows project, caller and patch precedence before Yarn hooks', () => {
  const environment = prepare(
    {
      NODE_OPTIONS: '--title=project',
      SHARED_VALUE: 'project',
      Remove_Me: 'project',
      npm_node_execpath: 'project-node',
    },
    {
      Node_Options: '--title=caller --trace-warnings',
      Raijin_Registered_Pnp_Loader: 'file:///stale-pnp-loader.mjs',
      shared_value: 'caller',
      NPM_NODE_EXECPATH: 'caller-node',
    },
    {
      remove_me: undefined,
      SHARED_VALUE: 'patch',
    },
    'win32'
  )

  assert.deepEqual(environment, {
    NODE_OPTIONS: '--title=caller --trace-warnings',
    SHARED_VALUE: 'patch',
  })
  assertUniqueWindowsNames(environment)
})

test('should preserve POSIX project, caller and patch casing before Yarn hooks', () => {
  assert.deepEqual(
    prepare(
      {
        NODE_OPTIONS: '--title=project',
        SHARED_VALUE: 'project',
      },
      {
        Node_Options: '--title=caller',
        shared_value: 'caller',
      },
      {
        shared_value: 'patch',
      },
      'linux'
    ),
    {
      NODE_OPTIONS: '--title=project',
      SHARED_VALUE: 'project',
      Node_Options: '--title=caller',
      shared_value: 'patch',
    }
  )
})

test('should delete and replace environment variables case-insensitively on Windows', () => {
  const environment = prepare(
    {},
    {
      FOO: 'first',
      Foo: 'second',
      NODE_OPTIONS: '--trace-warnings',
      OTHER_VALUE: 'preserved',
    },
    { foo: 'replacement', node_options: undefined },
    'win32'
  )

  assert.deepEqual(environment, { foo: 'replacement', OTHER_VALUE: 'preserved' })
  assertUniqueWindowsNames(environment)
})

test('should preserve case-sensitive patch semantics on POSIX', () => {
  assert.deepEqual(
    prepare(
      {},
      { FOO: 'preserved', NODE_OPTIONS: '--trace-warnings' },
      { foo: 'replacement' },
      'linux'
    ),
    { FOO: 'preserved', NODE_OPTIONS: '--trace-warnings', foo: 'replacement' }
  )
})

test('should reject managed environment names case-insensitively on Windows', () => {
  assert.throws(() => {
    prepare({}, {}, { Raijin_Registered_Pnp_Loader: 'file:///stale-pnp-loader.mjs' }, 'win32')
  }, /cannot override Raijin_Registered_Pnp_Loader/)
})

test('should preserve managed environment name casing on POSIX', () => {
  assert.deepEqual(prepare({}, {}, { Npm_Node_ExecPath: 'caller-node' }, 'linux'), {
    Npm_Node_ExecPath: 'caller-node',
  })
  assert.throws(() => {
    prepare({}, {}, { npm_node_execpath: 'override' }, 'linux')
  }, /cannot override npm_node_execpath/)
})

test('should remove an inherited PnP loader registration', () => {
  assert.deepEqual(
    prepare(
      {},
      {
        RAIJIN_REGISTERED_PNP_LOADER: 'file:///stale-pnp-loader.mjs',
        UNRELATED_VALUE: 'preserved',
      },
      {},
      'linux'
    ),
    { UNRELATED_VALUE: 'preserved' }
  )
})
