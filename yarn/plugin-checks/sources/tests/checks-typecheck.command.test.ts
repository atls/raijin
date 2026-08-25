import type { ChangedProjectState } from '@atls/yarn-plugin-files'
import type { ProcessExecutionResult } from '@atls/raijin/commands'
import type { ProjectInvocation }    from '@atls/raijin/commands'

import assert                       from 'node:assert/strict'
import { test }                     from 'node:test'

import { createTypecheckArguments } from '../checks-typecheck.command.jsx'
import { ChecksTypeCheckCommand }   from '../checks-typecheck.command.jsx'

class TestChecksTypeCheckCommand extends ChecksTypeCheckCommand {
  async run(invocation: ProjectInvocation, args: Array<string>): Promise<ProcessExecutionResult> {
    return this.runTypecheck(invocation, args)
  }
}

test('runs changed workspaces through native foreach in project typecheck mode', () => {
  const state: ChangedProjectState = {
    files: [
      { path: 'packages/app/src/index.ts', status: 'modified' },
      { path: 'packages/library/src/removed.ts', status: 'deleted' },
    ],
    workspaces: [{ path: 'packages/app' }, { path: 'packages/library' }],
  }

  assert.deepEqual(createTypecheckArguments(state), [
    'workspaces',
    'foreach',
    '--include',
    'packages/app',
    '--include',
    'packages/library',
    '--all',
    'typecheck',
  ])
})

test('uses project-relative root identity for an unnamed root workspace', () => {
  assert.deepEqual(
    createTypecheckArguments({
      files: [{ path: 'tsconfig.json', status: 'modified' }],
      workspaces: [{ path: '.' }],
    }),
    ['workspaces', 'foreach', '--include', '.', '--all', 'typecheck']
  )
})

test('invokes the new typecheck only in native project mode', async () => {
  const calls: Array<{ args: Array<string>; options: unknown }> = []
  const invocation = {
    yarn: {
      run: async (args: Array<string>, options: unknown) => {
        calls.push({ args, options })

        return { reason: 'completed', exitCode: 0, stdout: '', stderr: '' }
      },
    },
  } as unknown as ProjectInvocation
  const args = createTypecheckArguments({
    files: [{ path: 'packages/app/src/index.ts', status: 'modified' }],
    workspaces: [{ path: 'packages/app' }],
  })

  assert.ok(args)

  await new TestChecksTypeCheckCommand().run(invocation, args)

  assert.deepEqual(calls, [
    {
      args: [
        'workspaces',
        'foreach',
        '--include',
        'packages/app',
        '--all',
        'typecheck',
      ],
      options: { input: 'ignore', timeoutMs: 300000 },
    },
  ])
  assert.equal(calls[0]?.args.includes('packages/app/src/index.ts'), false)
})

test('skips an empty state and keeps unfiltered typecheck in project mode', () => {
  assert.equal(createTypecheckArguments({ files: [], workspaces: [] }), undefined)
  assert.deepEqual(createTypecheckArguments(), ['typecheck'])
})
