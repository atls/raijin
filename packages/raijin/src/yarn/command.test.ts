import assert                           from 'node:assert/strict'
import { test }                         from 'node:test'

import { createYarnCommandEnvironment } from './command.js'

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

test(
  'should replace mixed-case command directories on Windows',
  { skip: process.platform !== 'win32' },
  () => {
    assert.deepEqual(
      createYarnCommandEnvironment('C:\\repo\\package', {
        Init_Cwd: 'C:\\stale-init',
        Project_Cwd: 'C:\\stale-project',
      }),
      {
        INIT_CWD: 'C:\\repo\\package',
        PROJECT_CWD: 'C:\\repo\\package',
      }
    )
  }
)
