import type { ProcessExecutionResult } from '@atls/raijin/commands'
import type { ProjectInvocation }      from '@atls/raijin/commands'
import type { ChangedProjectState }    from '@atls/yarn-plugin-files'

import assert                          from 'node:assert/strict'
import test                            from 'node:test'

import { npath }                       from '@yarnpkg/fslib'

import { ChecksTypeCheckCommand }      from '../checks-typecheck.command.jsx'

class TestChecksTypeCheckCommand extends ChecksTypeCheckCommand {
  shouldRun(state?: ChangedProjectState): boolean {
    return this.shouldRunTypecheck(state)
  }

  async run(invocation: ProjectInvocation): Promise<ProcessExecutionResult> {
    return this.runTypecheck(invocation)
  }
}

test('uses changed TypeScript files only to gate one project-mode typecheck', async () => {
  const command = new TestChecksTypeCheckCommand()
  const calls: Array<{ args: Array<string>; options: unknown }> = []

  command.changed = true

  const state: ChangedProjectState = {
    files: [
      { path: 'packages/app/src/index.ts', status: 'modified' },
      {
        path: 'packages/app/src/renamed.mts',
        previousPath: 'packages/app/src/original.mts',
        status: 'renamed',
      },
      { path: 'packages/app/src/removed.ts', status: 'deleted' },
      { path: 'packages/app/src/runtime.js', status: 'modified' },
    ],
    workspaces: [{ path: 'packages/app' }],
  }

  const invocation = {
    project: { cwd: npath.toPortablePath('/repo') },
    yarn: {
      run: async (args: Array<string>, options: unknown) => {
        calls.push({ args, options })

        return { reason: 'completed', exitCode: 0, stdout: '', stderr: '' }
      },
    },
  } as unknown as ProjectInvocation

  assert.equal(command.shouldRun(state), true)
  await command.run(invocation)

  assert.deepEqual(calls, [
    {
      args: ['typecheck'],
      options: { input: 'ignore', timeoutMs: 300000 },
    },
  ])
})

test('does not run project typecheck for deleted or non-TypeScript changed files', () => {
  const command = new TestChecksTypeCheckCommand()

  command.changed = true

  assert.equal(
    command.shouldRun({
      files: [
        { path: 'packages/app/src/removed.ts', status: 'deleted' },
        { path: 'packages/app/src/runtime.js', status: 'modified' },
      ],
      workspaces: [{ path: 'packages/app' }],
    }),
    false
  )
})

test('requires selected changed state for changed TypeCheck', async () => {
  const command = new TestChecksTypeCheckCommand()

  command.changed = true

  await assert.rejects(
    async () => command.shouldRun(),
    /Changed TypeScript targets require changed project state/
  )
})

test('leaves non-changed TypeCheck scope to project mode', () => {
  const command = new TestChecksTypeCheckCommand()

  command.changed = false

  assert.equal(command.shouldRun(), true)
})
