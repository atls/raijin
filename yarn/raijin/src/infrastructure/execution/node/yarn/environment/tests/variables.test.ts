import assert                   from 'node:assert/strict'
import { test }                 from 'node:test'

import { create as createBase } from '../base.js'
import { applyPatch }           from '../variables.js'
import { merge }                from '../variables.js'

const assertUniqueWindowsNames = (environment: NodeJS.ProcessEnv): void => {
  const names = Object.keys(environment).map((name) => name.toUpperCase())

  assert.equal(new Set(names).size, names.length)
}

test('should merge Windows environments case-insensitively with later sources winning', () => {
  const environment = merge(
    [
      { Path: 'project-path', SHARED_VALUE: 'project', Project_Only: 'project' },
      { PATH: 'caller-path', shared_value: 'caller', CALLER_ONLY: 'caller' },
    ],
    'win32'
  )

  assert.deepEqual(environment, {
    PATH: 'caller-path',
    Project_Only: 'project',
    shared_value: 'caller',
    CALLER_ONLY: 'caller',
  })
  assertUniqueWindowsNames(environment)
})

test('should preserve case-sensitive source precedence on POSIX', () => {
  assert.deepEqual(
    merge([{ PATH: 'project-path', SHARED_VALUE: 'project' }, { Path: 'caller-path' }], 'linux'),
    {
      PATH: 'project-path',
      SHARED_VALUE: 'project',
      Path: 'caller-path',
    }
  )
})

test('should canonicalize environment names consumed by Yarn on Windows', () => {
  const environment = merge(
    [{ Node_Options: '--title=caller --trace-warnings', Path: 'caller-path' }],
    'win32'
  )

  assert.deepEqual(environment, {
    NODE_OPTIONS: '--title=caller --trace-warnings',
    PATH: 'caller-path',
  })
})

test('should preserve Yarn environment name casing on POSIX', () => {
  assert.deepEqual(
    merge(
      [{ Node_Options: '--title=caller', NODE_OPTIONS: '--trace-warnings', Path: 'path' }],
      'linux'
    ),
    {
      Node_Options: '--title=caller',
      NODE_OPTIONS: '--trace-warnings',
      Path: 'path',
    }
  )
})

test('should delete environment variables case-insensitively on Windows', () => {
  const environment = {
    NODE_OPTIONS: '--trace-warnings',
    Node_Options: '--enable-source-maps',
    OTHER_VALUE: 'preserved',
  }

  applyPatch(environment, { node_options: undefined }, 'win32')

  assert.deepEqual(environment, { OTHER_VALUE: 'preserved' })
})

test('should preserve case-sensitive environment variables on POSIX', () => {
  const environment = {
    NODE_OPTIONS: '--trace-warnings',
    node_options: '--enable-source-maps',
  }

  applyPatch(environment, { node_options: undefined }, 'linux')

  assert.deepEqual(environment, { NODE_OPTIONS: '--trace-warnings' })
})

test('should replace environment variables case-insensitively on Windows', () => {
  const environment = {
    FOO: 'first',
    Foo: 'second',
    OTHER_VALUE: 'preserved',
  }

  applyPatch(environment, { foo: 'replacement' }, 'win32')

  assert.deepEqual(environment, { foo: 'replacement', OTHER_VALUE: 'preserved' })
  assertUniqueWindowsNames(environment)
})

test('should canonicalize patched Yarn environment names on Windows', () => {
  const environment = {
    Node_Options: '--title=caller',
  }

  applyPatch(environment, { node_options: '--trace-warnings' }, 'win32')

  assert.deepEqual(environment, { NODE_OPTIONS: '--trace-warnings' })
})

test('should preserve case-sensitive environment assignments on POSIX', () => {
  const environment = {
    FOO: 'preserved',
  }

  applyPatch(environment, { foo: 'replacement' }, 'linux')

  assert.deepEqual(environment, { FOO: 'preserved', foo: 'replacement' })
})

test('should reject managed environment names case-insensitively on Windows', () => {
  assert.throws(() => {
    applyPatch({}, { Raijin_Registered_Pnp_Loader: 'file:///stale-pnp-loader.mjs' }, 'win32')
  }, /cannot override Raijin_Registered_Pnp_Loader/)
})

test('should preserve managed environment name casing on POSIX', () => {
  const environment = {}

  applyPatch(environment, { Npm_Node_ExecPath: 'caller-node' }, 'linux')

  assert.deepEqual(environment, { Npm_Node_ExecPath: 'caller-node' })
  assert.throws(() => {
    applyPatch(environment, { npm_node_execpath: 'override' }, 'linux')
  }, /cannot override npm_node_execpath/)
})

test('should apply Windows project, caller and patch precedence before Yarn hooks', () => {
  const environment = createBase(
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
    createBase(
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

test('should remove an inherited PnP loader registration from a POSIX execution environment', () => {
  assert.deepEqual(
    createBase(
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
