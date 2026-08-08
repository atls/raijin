import assert                    from 'node:assert/strict'
import { test }                  from 'node:test'

import { applyEnvironmentPatch } from './environment.js'

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
})

test('should preserve case-sensitive environment assignments on POSIX', () => {
  const environment = {
    FOO: 'preserved',
  }

  applyEnvironmentPatch(environment, { foo: 'replacement' }, 'linux')

  assert.deepEqual(environment, { FOO: 'preserved', foo: 'replacement' })
})
