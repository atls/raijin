import type { PortablePath } from '@yarnpkg/fslib'

import assert                from 'node:assert/strict'
import { test }              from 'node:test'

import { createOptions }     from './options.js'

test('should translate the complete Globby invocation on Windows', () => {
  const toNativePath = (path: PortablePath): string => {
    assert.equal(path, '/C:/repo/client')

    return String.raw`C:\repo\client`
  }

  assert.deepEqual(
    createOptions(
      {
        cwd: '/C:/repo/client' as never,
        patterns: ['/C:/repo/client/src/**/*.ts'],
        ignore: ['!/C:/repo/client/src/**/*.test.ts'],
        dot: true,
      },
      { toNativePath },
      'win32'
    ),
    {
      patterns: ['C:/repo/client/src/**/*.ts'],
      options: {
        cwd: String.raw`C:\repo\client`,
        ignore: ['!C:/repo/client/src/**/*.test.ts'],
        dot: true,
        absolute: true,
        onlyFiles: true,
      },
    }
  )
})

test('should preserve the Globby invocation on POSIX', () => {
  assert.deepEqual(
    createOptions(
      {
        cwd: '/repo/client' as never,
        patterns: ['/repo/client/src/**/*.ts'],
      },
      { toNativePath: (path) => path },
      'linux'
    ),
    {
      patterns: ['/repo/client/src/**/*.ts'],
      options: {
        cwd: '/repo/client',
        ignore: [],
        dot: false,
        absolute: true,
        onlyFiles: true,
      },
    }
  )
})
