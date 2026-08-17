import assert                 from 'node:assert/strict'
import test                   from 'node:test'

import { createForeachInput } from './workspaces-changed-foreach.input.js'

test('should run native foreach over selected workspaces without worktree refiltering', () => {
  const input = createForeachInput(['@atls/raijin-assembly', '@atls/yarn-plugin-release'], {
    exclude: '.',
    verbose: true,
  })

  assert.deepEqual(input, [
    'workspaces',
    'foreach',
    '--include',
    '@atls/raijin-assembly',
    '--include',
    '@atls/yarn-plugin-release',
    '--all',
    '--exclude',
    '.',
    '--verbose',
  ])
})

test('should keep private workspaces unless no private flag is explicit', () => {
  const input = createForeachInput(['@atls/raijin-assembly'], {})
  const publicOnlyInput = createForeachInput(['@atls/raijin-assembly'], { publicOnly: true })

  assert.equal(input.includes('--no-private'), false)
  assert.equal(publicOnlyInput.includes('--no-private'), true)
})
