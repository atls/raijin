import assert                           from 'node:assert/strict'
import { join }                         from 'node:path'
import { test }                         from 'node:test'

import { createYarnCommandArguments }   from './command.js'
import { createYarnCommandEnvironment } from './command.js'
import { createYarnCommandFile }        from './command.js'

test('should allow nested yarn commands to follow configured yarnPath', () => {
  assert.deepEqual(
    createYarnCommandEnvironment('/repo/package', { FOO: 'bar', YARN_IGNORE_PATH: '1' }),
    {
      FOO: 'bar',
      INIT_CWD: '/repo/package',
      PROJECT_CWD: '/repo/package',
    }
  )
})

test('should execute installed Raijin runtime directly', () => {
  assert.equal(
    createYarnCommandFile('/repo/package'),
    join('/repo/package', '.yarn/releases/yarn.mjs')
  )
  assert.deepEqual(createYarnCommandArguments('/repo/package', ['install']), [
    join('/repo/package', '.yarn/releases/yarn.mjs'),
    'install',
  ])
})
