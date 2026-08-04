import type { ChildProcessInvocation } from '@atls/raijin/commands'

import assert                          from 'node:assert/strict'
import { test }                        from 'node:test'

import { captureGit }                  from '../git.js'

test('should capture Git output through project invocation scope', async () => {
  const calls: Array<unknown> = []
  const child: ChildProcessInvocation = {
    execute: async (...args) => {
      calls.push(args)

      return {
        exitCode: 0,
        stderr: '',
        stdout: 'main\n',
        termination: 'exit',
        timedOut: false,
      }
    },
  }

  assert.equal(await captureGit(child, ['rev-parse', 'HEAD']), 'main\n')
  assert.deepEqual(calls, [
    ['git', ['rev-parse', 'HEAD'], { output: { mode: 'capture' }, scope: 'project' }],
  ])
})

test('should reject failed Git execution', async () => {
  const child: ChildProcessInvocation = {
    execute: async () => ({
      exitCode: 128,
      stderr: 'fatal: bad revision',
      stdout: '',
      termination: 'exit',
      timedOut: false,
    }),
  }

  await assert.rejects(captureGit(child, ['rev-parse', 'HEAD']), /fatal: bad revision/)
})
