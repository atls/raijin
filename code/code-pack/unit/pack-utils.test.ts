import type { ProcessInvocation } from '@atls/raijin/commands'

import assert                     from 'node:assert/strict'
import test                       from 'node:test'

import { execOrThrow }            from '../src/pack.utils.js'

test('should resolve when command exits with zero code', async () => {
  const processInvocation: ProcessInvocation = {
    execute: async () => ({ exitCode: 0, stderr: '', stdout: '' }),
  }

  await assert.doesNotReject(
    execOrThrow(processInvocation, process.execPath, ['-e', 'process.exit(0)'])
  )
})

test('should reject when command exits with non-zero code', async () => {
  const processInvocation: ProcessInvocation = {
    execute: async () => ({ exitCode: 17, stderr: '', stdout: '' }),
  }

  await assert.rejects(
    execOrThrow(processInvocation, process.execPath, ['-e', 'process.exit(17)']),
    /failed with exit code 17/
  )
})
