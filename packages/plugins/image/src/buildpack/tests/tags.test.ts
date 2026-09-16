import type { CommandExecutor }    from '../executor.interfaces.js'

import assert                      from 'node:assert/strict'
import test                        from 'node:test'

import { npath }                   from '@yarnpkg/fslib'

import { getPackImageTags }        from '../tags.js'
import { getRevision }             from '../tags.js'
import { normalizeAdditionalTags } from '../tags.js'

test('should keep the primary, latest, and selected alias tags', () => {
  assert.deepEqual(
    getPackImageTags('registry.example.com/app', 'revision', ['stage', 'production']),
    [
      'registry.example.com/app:revision',
      'registry.example.com/app:latest',
      'registry.example.com/app:stage',
      'registry.example.com/app:production',
    ]
  )
})

test('should reject unsafe image tag aliases', () => {
  assert.throws(() => normalizeAdditionalTags(['']), /Invalid image tag alias/)
  assert.throws(() => normalizeAdditionalTags(['stage/latest']), /Invalid image tag alias/)
})

test('should capture the local git revision through the command capability', async (t) => {
  const githubEventPath = process.env.GITHUB_EVENT_PATH
  const githubToken = process.env.GITHUB_TOKEN

  delete process.env.GITHUB_EVENT_PATH
  delete process.env.GITHUB_TOKEN

  t.after(() => {
    if (githubEventPath === undefined) {
      delete process.env.GITHUB_EVENT_PATH
    } else {
      process.env.GITHUB_EVENT_PATH = githubEventPath
    }

    if (githubToken === undefined) {
      delete process.env.GITHUB_TOKEN
    } else {
      process.env.GITHUB_TOKEN = githubToken
    }
  })

  const commandExecutor: CommandExecutor = {
    cwd: npath.toPortablePath('/workspace'),
    execute: async (command, args, options) => {
      assert.equal(command, 'git')
      assert.deepEqual(args, ['log', '-1', '--format="%H"'])
      assert.deepEqual(options, { capture: true })

      return { exitCode: 0, stderr: '', stdout: '"abc123"\n' }
    },
  }

  assert.equal(await getRevision(commandExecutor), 'abc123')
})
