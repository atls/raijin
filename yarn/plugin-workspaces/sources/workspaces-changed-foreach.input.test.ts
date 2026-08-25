import assert                 from 'node:assert/strict'
import test                   from 'node:test'

import { Cli }                from 'clipanion'

import { createForeachInput } from './workspaces-changed-foreach.input.js'
import { WorkspacesChangedForeachCommand } from './workspaces-changed-foreach.command.js'

test('parses explicit --since into the changed-state entrypoint', () => {
  const cli = new Cli({
    binaryLabel: 'Yarn',
    binaryName: 'yarn',
    binaryVersion: '0.0.0',
  })

  cli.register(WorkspacesChangedForeachCommand)

  const command = cli.process([
    'workspaces',
    'changed',
    'foreach',
    '--since',
    'origin/main',
    'build',
  ])

  if (!(command instanceof WorkspacesChangedForeachCommand)) {
    assert.fail('Expected workspaces changed foreach command')
  }

  assert.equal(command.since, 'origin/main')
})

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
