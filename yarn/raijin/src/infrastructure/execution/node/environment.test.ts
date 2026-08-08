import assert                            from 'node:assert/strict'
import { test }                          from 'node:test'

import { applyEnvironmentPatch }         from './environment.js'
import { createYarnNodeBaseEnvironment } from './environment.js'
import { mergeEnvironmentVariables }     from './environment.js'

const assertUniqueWindowsEnvironmentNames = (environment: NodeJS.ProcessEnv): void => {
  const names = Object.keys(environment).map((name) => name.toUpperCase())

  assert.equal(new Set(names).size, names.length)
}

test('should merge Windows environments case-insensitively with later sources winning', () => {
  const environment = mergeEnvironmentVariables(
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
  assertUniqueWindowsEnvironmentNames(environment)
})

test('should preserve case-sensitive source precedence on POSIX', () => {
  assert.deepEqual(
    mergeEnvironmentVariables(
      [{ PATH: 'project-path', SHARED_VALUE: 'project' }, { Path: 'caller-path' }],
      'linux'
    ),
    {
      PATH: 'project-path',
      SHARED_VALUE: 'project',
      Path: 'caller-path',
    }
  )
})

test('should canonicalize environment names consumed by Yarn on Windows', () => {
  const environment = mergeEnvironmentVariables(
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
    mergeEnvironmentVariables(
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

  applyEnvironmentPatch(environment, { node_options: undefined }, 'win32')

  assert.deepEqual(environment, { OTHER_VALUE: 'preserved' })
})

test('should preserve case-sensitive environment variables on POSIX', () => {
  const environment = {
    NODE_OPTIONS: '--trace-warnings',
    node_options: '--enable-source-maps',
  }

  applyEnvironmentPatch(environment, { node_options: undefined }, 'linux')

  assert.deepEqual(environment, { NODE_OPTIONS: '--trace-warnings' })
})

test('should replace environment variables case-insensitively on Windows', () => {
  const environment = {
    FOO: 'first',
    Foo: 'second',
    OTHER_VALUE: 'preserved',
  }

  applyEnvironmentPatch(environment, { foo: 'replacement' }, 'win32')

  assert.deepEqual(environment, { foo: 'replacement', OTHER_VALUE: 'preserved' })
  assertUniqueWindowsEnvironmentNames(environment)
})

test('should canonicalize patched Yarn environment names on Windows', () => {
  const environment = {
    Node_Options: '--title=caller',
  }

  applyEnvironmentPatch(environment, { node_options: '--trace-warnings' }, 'win32')

  assert.deepEqual(environment, { NODE_OPTIONS: '--trace-warnings' })
})

test('should preserve case-sensitive environment assignments on POSIX', () => {
  const environment = {
    FOO: 'preserved',
  }

  applyEnvironmentPatch(environment, { foo: 'replacement' }, 'linux')

  assert.deepEqual(environment, { FOO: 'preserved', foo: 'replacement' })
})

test('should reject managed environment names case-insensitively', () => {
  assert.throws(() => {
    applyEnvironmentPatch({}, { Npm_Node_ExecPath: 'caller-node' }, 'win32')
  }, /cannot override Npm_Node_ExecPath/)
})

test('should apply Windows project, caller and patch precedence before Yarn hooks', () => {
  const environment = createYarnNodeBaseEnvironment(
    {
      NODE_OPTIONS: '--title=project',
      SHARED_VALUE: 'project',
      Remove_Me: 'project',
      npm_node_execpath: 'project-node',
    },
    {
      Node_Options: '--title=caller --trace-warnings',
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
  assertUniqueWindowsEnvironmentNames(environment)
})

test('should preserve POSIX project, caller and patch casing before Yarn hooks', () => {
  assert.deepEqual(
    createYarnNodeBaseEnvironment(
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
