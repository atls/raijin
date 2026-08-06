import type { CommandExecutor } from '../src/command.interfaces.js'

import assert                   from 'node:assert/strict'
import test                     from 'node:test'

import { npath }                from '@yarnpkg/fslib'

import { getRevision }          from '../src/tag.utils.js'

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
