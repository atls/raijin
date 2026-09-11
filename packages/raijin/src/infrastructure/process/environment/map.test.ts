import assert           from 'node:assert/strict'
import { test }         from 'node:test'

import { applyPatch }   from './map.js'
import { createNames }  from './map.js'
import { includesName } from './map.js'
import { merge }        from './map.js'
import { remove }       from './map.js'
import { set }          from './map.js'

const assertUniqueWindowsNames = (environment: NodeJS.ProcessEnv): void => {
  const names = Object.keys(environment).map((name) => name.toUpperCase())

  assert.equal(new Set(names).size, names.length)
}

test('should merge Windows environments case-insensitively with later sources winning', () => {
  const canonicalNames = createNames(['PATH'])
  const environment = merge(
    [
      { Path: 'project-path', SHARED_VALUE: 'project', Project_Only: 'project' },
      { PATH: 'caller-path', shared_value: 'caller', CALLER_ONLY: 'caller' },
    ],
    'win32',
    canonicalNames
  )

  assert.deepEqual(environment, {
    PATH: 'caller-path',
    Project_Only: 'project',
    shared_value: 'caller',
    CALLER_ONLY: 'caller',
  })
  assertUniqueWindowsNames(environment)
})

test('should preserve caller casing without an explicit canonical name on Windows', () => {
  const environment = merge(
    [{ NODE_OPTIONS: '--trace-warnings' }, { node_options: '--enable-source-maps' }],
    'win32'
  )

  assert.deepEqual(environment, { node_options: '--enable-source-maps' })
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

test('should remove and replace Windows environment names case-insensitively', () => {
  const canonicalNames = createNames(['NODE_OPTIONS'])
  const environment = {
    FOO: 'first',
    Foo: 'second',
    Node_Options: '--trace-warnings',
    OTHER_VALUE: 'preserved',
  }

  remove(environment, 'foo', 'win32')
  set(environment, 'node_options', '--enable-source-maps', 'win32', canonicalNames)

  assert.deepEqual(environment, {
    NODE_OPTIONS: '--enable-source-maps',
    OTHER_VALUE: 'preserved',
  })
  assertUniqueWindowsNames(environment)
})

test('should preserve case-sensitive assignments on POSIX', () => {
  const environment = { FOO: 'preserved' }

  set(environment, 'foo', 'replacement', 'linux')
  remove(environment, 'foo', 'linux')

  assert.deepEqual(environment, { FOO: 'preserved' })
})

test('should apply Windows patches case-insensitively', () => {
  const environment = {
    FOO: 'first',
    Foo: 'second',
    NODE_OPTIONS: '--trace-warnings',
    OTHER_VALUE: 'preserved',
  }

  applyPatch(environment, { foo: 'replacement', node_options: undefined }, 'win32')

  assert.deepEqual(environment, { foo: 'replacement', OTHER_VALUE: 'preserved' })
  assertUniqueWindowsNames(environment)
})

test('should apply POSIX patches case-sensitively', () => {
  const environment = { FOO: 'preserved', NODE_OPTIONS: '--trace-warnings' }

  applyPatch(environment, { foo: 'replacement' }, 'linux')

  assert.deepEqual(environment, {
    FOO: 'preserved',
    NODE_OPTIONS: '--trace-warnings',
    foo: 'replacement',
  })
})

test('should match environment names using platform semantics', () => {
  const names = ['PROJECT_CWD']

  assert.equal(includesName(names, 'Project_Cwd', 'win32'), true)
  assert.equal(includesName(names, 'Project_Cwd', 'linux'), false)
  assert.equal(includesName(names, 'PROJECT_CWD', 'linux'), true)
})
