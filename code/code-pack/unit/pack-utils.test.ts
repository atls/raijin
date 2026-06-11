import assert          from 'node:assert/strict'
import test            from 'node:test'

import { npath }       from '@yarnpkg/fslib'

import { execOrThrow } from '../src/pack.utils.js'

const cwd = npath.toPortablePath(process.cwd())

test('should resolve when command exits with zero code', async () => {
  await assert.doesNotReject(
    execOrThrow(process.execPath, ['-e', 'process.exit(0)'], {
      cwd,
      env: process.env,
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
    })
  )
})

test('should reject when command exits with non-zero code', async () => {
  await assert.rejects(
    execOrThrow(process.execPath, ['-e', 'process.exit(17)'], {
      cwd,
      env: process.env,
      stdin: process.stdin,
      stdout: process.stdout,
      stderr: process.stderr,
    }),
    /failed with exit code 17/
  )
})
