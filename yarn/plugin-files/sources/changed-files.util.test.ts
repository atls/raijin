import type { ChildProcessInvocation } from '@atls/raijin/commands'

import assert                          from 'node:assert/strict'
import { test }                        from 'node:test'

import { getChangedFiles }             from './changed-files.util.js'

test('should prefer local git diff over GitHub event files', async (t) => {
  const previousEventPath = process.env.GITHUB_EVENT_PATH
  const previousToken = process.env.GITHUB_TOKEN

  process.env.GITHUB_EVENT_PATH = '/tmp/fake-event.json'
  process.env.GITHUB_TOKEN = 'fake-token'

  t.after(() => {
    if (previousEventPath) {
      process.env.GITHUB_EVENT_PATH = previousEventPath
    } else {
      delete process.env.GITHUB_EVENT_PATH
    }

    if (previousToken) {
      process.env.GITHUB_TOKEN = previousToken
    } else {
      delete process.env.GITHUB_TOKEN
    }
  })

  const child: ChildProcessInvocation = {
    execute: async (_command, _args, options) => {
      assert.deepEqual(options, {
        output: { mode: 'capture' },
        scope: 'project',
      })

      return {
        exitCode: 0,
        stderr: '',
        stdout: 'yarn/plugin-release/package.json\n',
        termination: 'exit' as const,
        timedOut: false as const,
      }
    },
  }

  const files = await getChangedFiles(child)

  assert.deepEqual(files, ['yarn/plugin-release/package.json'])
})
