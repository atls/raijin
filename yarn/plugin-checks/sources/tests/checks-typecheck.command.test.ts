import type { CommandInput }           from '@atls/raijin/commands'
import type { ProcessExecutionResult } from '@atls/raijin/commands'
import type { ProjectInvocation }      from '@atls/raijin/commands'
import type { ChangedProjectState }    from '@atls/yarn-plugin-files'

import assert                          from 'node:assert/strict'
import { mkdir }                       from 'node:fs/promises'
import { mkdtemp }                     from 'node:fs/promises'
import { writeFile }                   from 'node:fs/promises'
import { tmpdir }                      from 'node:os'
import { join }                        from 'node:path'
import test                            from 'node:test'

import { Manifest }                    from '@yarnpkg/core'
import { npath }                       from '@yarnpkg/fslib'

import { toCommandArguments }          from '@atls/raijin/commands'

import { ChecksTypeCheckCommand }      from '../checks-typecheck.command.jsx'

class TestChecksTypeCheckCommand extends ChecksTypeCheckCommand {
  async resolveInput(
    cwd: string,
    state?: ChangedProjectState
  ): Promise<CommandInput | undefined> {
    const projectCwd = npath.toPortablePath(cwd)
    const topLevelWorkspace = {
      cwd: projectCwd,
      manifest: Manifest.fromText(JSON.stringify({ workspaces: ['packages/*'] })),
    }

    return this.getInput(
      {
        cwd: projectCwd,
        topLevelWorkspace,
        workspaces: [topLevelWorkspace],
      } as never,
      ['packages/*'],
      state
    )
  }

  async run(
    invocation: ProjectInvocation,
    input: CommandInput | undefined
  ): Promise<ProcessExecutionResult> {
    return this.runTypecheck(invocation, input)
  }
}

test('passes surviving changed TypeScript paths to one exact-file typecheck', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-checks-typecheck-'))
  const sourceDirectory = join(cwd, 'packages/app/src')
  const command = new TestChecksTypeCheckCommand()
  const calls: Array<{ args: Array<string>; options: unknown }> = []

  await mkdir(sourceDirectory, { recursive: true })
  await writeFile(join(sourceDirectory, 'index.ts'), 'export const value = true\n')
  await writeFile(join(sourceDirectory, 'renamed.mts'), 'export const renamed = true\n')
  await writeFile(join(sourceDirectory, 'runtime.js'), 'export const runtime = true\n')

  command.changed = true

  const input = await command.resolveInput(cwd, {
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
  })

  assert.ok(input)

  const invocation = {
    project: { cwd: npath.toPortablePath(cwd) },
    yarn: {
      run: async (args: Array<string>, options: unknown) => {
        calls.push({ args, options })

        return { reason: 'completed', exitCode: 0, stdout: '', stderr: '' }
      },
    },
  } as unknown as ProjectInvocation

  await command.run(invocation, input)

  assert.deepEqual(calls, [
    {
      args: [
        'typecheck',
        'packages/app/src/index.ts',
        'packages/app/src/renamed.mts',
      ],
      options: { input: 'ignore', timeoutMs: 300000 },
    },
  ])
  assert.equal(calls[0]?.args.includes('workspaces'), false)
})

test('requires selected changed state for changed TypeCheck', async () => {
  const command = new TestChecksTypeCheckCommand()

  command.changed = true

  await assert.rejects(
    command.resolveInput('/repo'),
    /Changed TypeScript targets require changed project state/
  )
})

test('should use project workspace patterns when tsconfig is absent', async () => {
  const command = new TestChecksTypeCheckCommand()

  command.changed = false

  const input = await command.resolveInput('/repo')

  assert.ok(input)
  assert.deepEqual(toCommandArguments(input), ['packages/*'])
})

test('should leave configured project scope to typecheck', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-checks-typecheck-'))
  const command = new TestChecksTypeCheckCommand()

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'index.ts'), 'export const value = true\n')
  await writeFile(join(cwd, 'tsconfig.json'), '{"include":["index.ts"]}\n')
  command.changed = false

  assert.equal(await command.resolveInput(cwd), undefined)
})

test('should leave solution-style project scope to typecheck', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-checks-typecheck-'))
  const command = new TestChecksTypeCheckCommand()

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(
    join(cwd, 'tsconfig.json'),
    '{"files":[],"references":[{"path":"./packages/app"}]}\n'
  )
  command.changed = false

  assert.equal(await command.resolveInput(cwd), undefined)
})
