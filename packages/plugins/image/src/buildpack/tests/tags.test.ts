import type { CommandExecutor }    from '../executor.interfaces.js'

import assert                      from 'node:assert/strict'
import test                        from 'node:test'

import { npath }                   from '@yarnpkg/fslib'

import { getPackImageTags }        from '../tags.js'
import { getRevision }             from '../tags.js'
import { normalizeAdditionalTags } from '../tags.js'

test('should keep primary and floating tags alongside revision-qualified aliases', () => {
  assert.deepEqual(
    getPackImageTags('registry.example.com/app', 'revision', ['stage'], ['stage', 'production']),
    [
      'registry.example.com/app:revision',
      'registry.example.com/app:latest',
      'registry.example.com/app:stage',
      'registry.example.com/app:revision-stage',
      'registry.example.com/app:revision-production',
    ]
  )
})

test('should reject invalid aliases and invalid generated tags', () => {
  assert.throws(() => normalizeAdditionalTags(['']), /Invalid image tag alias/)
  assert.throws(() => normalizeAdditionalTags(['stage/latest']), /Invalid image tag alias/)
  assert.throws(
    () => getPackImageTags('app', 'a'.repeat(128), [], ['stage']),
    /Invalid image tag alias/
  )
})

test('should capture the verified Git revision through the command capability', async () => {
  const executor: CommandExecutor = {
    cwd: npath.toPortablePath('/workspace'),
    execute: async (command, args, options) => {
      assert.equal(command, 'git')
      assert.deepEqual(args, ['rev-parse', '--verify', 'HEAD'])
      assert.deepEqual(options, { capture: true })

      return { exitCode: 0, stderr: '', stdout: 'abc123\n' }
    },
  }

  assert.equal(await getRevision(executor), 'abc123')
})

test('should not accept an absent Git revision', async () => {
  const executor: CommandExecutor = {
    cwd: npath.toPortablePath('/workspace'),
    execute: async () => ({ exitCode: 0, stderr: '', stdout: '' }),
  }

  await assert.rejects(getRevision(executor), /did not return a revision/)
})
