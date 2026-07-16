import assert                          from 'node:assert/strict'
import test                            from 'node:test'

import { structUtils }                 from '@yarnpkg/core'

import { assertNextBuildExitCode }     from './arguments.js'
import { createNextBuildArguments }    from './arguments.js'
import { createNextDevArguments }      from './arguments.js'
import { assertSupportedNextVersion }  from './version.js'
import { normalizeNextPackageVersion } from './version.js'
import { resolveNextPackageVersion }   from './version.js'

test('should reject unsupported Next versions before 16', () => {
  for (const version of ['14.0.0', '14.2.24', '15.0.0', '15.3.1', '15.5.0']) {
    const error = {
      message: `Renderer build requires Next.js 16 or newer, found ${version}`,
    }

    assert.throws(() => {
      createNextBuildArguments(version)
    }, error)
    assert.throws(() => {
      assertSupportedNextVersion(version)
    }, error)
  }
})

test('should use explicit webpack build arguments for Next versions after 15', () => {
  assert.deepEqual(createNextBuildArguments('16.0.7'), [
    'node',
    'next',
    'build',
    '--webpack',
    'src',
  ])
})

test('should use explicit webpack dev arguments for Next versions after 15', () => {
  assert.deepEqual(createNextDevArguments('16.2.10'), ['next', 'dev', 'src', '--webpack'])
})

test('should run Next dev from the renderer source app directory', () => {
  assert.deepEqual(createNextDevArguments(undefined), ['next', 'dev', 'src'])
})

test('should normalize Next npm package references before version checks', () => {
  assert.equal(normalizeNextPackageVersion('npm:16.2.9'), '16.2.9')
  assert.deepEqual(createNextBuildArguments(normalizeNextPackageVersion('npm:16.2.9')), [
    'node',
    'next',
    'build',
    '--webpack',
    'src',
  ])
})

test('should devirtualize Next locator references before version checks', () => {
  const locator = structUtils.makeLocator(
    structUtils.makeIdent(null, 'next'),
    'virtual:peer-reference#npm:16.2.9'
  )

  assert.equal(resolveNextPackageVersion(locator), '16.2.9')
  assert.deepEqual(createNextBuildArguments(resolveNextPackageVersion(locator)), [
    'node',
    'next',
    'build',
    '--webpack',
    'src',
  ])
})

test('should normalize patched Next package references before version checks', () => {
  const reference = 'patch:next@npm%3A16.2.9#~/.yarn/patches/next.patch'

  assert.equal(normalizeNextPackageVersion(reference), '16.2.9')
  assert.deepEqual(createNextBuildArguments(normalizeNextPackageVersion(reference)), [
    'node',
    'next',
    'build',
    '--webpack',
    'src',
  ])
})

test('should avoid version-specific build arguments when the version is unknown', () => {
  assert.deepEqual(createNextBuildArguments(undefined), ['node', 'next', 'build', 'src'])
})

test('should accept a successful Next build exit code', () => {
  assert.doesNotThrow(() => {
    assertNextBuildExitCode(0)
  })
})

test('should reject a failed Next build exit code', () => {
  assert.throws(() => {
    assertNextBuildExitCode(1)
  }, /Renderer build failed with exit code 1/)
})
