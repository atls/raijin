import type { CommandInput }  from '@atls/raijin/commands'

import assert                 from 'node:assert/strict'
import { mkdir }              from 'node:fs/promises'
import { mkdtemp }            from 'node:fs/promises'
import { writeFile }          from 'node:fs/promises'
import { tmpdir }             from 'node:os'
import { join }               from 'node:path'
import { test }               from 'node:test'

import { Manifest }           from '@yarnpkg/core'
import { npath }              from '@yarnpkg/fslib'

import { toCommandArguments } from '@atls/raijin/commands'

import { TypeCheckCommand }   from './typecheck.command.js'

class TestTypeCheckCommand extends TypeCheckCommand {
  async resolveIncludes(
    projectCwd: string,
    invocationCwd: string,
    typecheckCwd: string
  ): Promise<CommandInput | undefined> {
    const projectCwdPortable = npath.toPortablePath(projectCwd)
    const topLevelWorkspace = {
      cwd: projectCwdPortable,
      manifest: Manifest.fromText(JSON.stringify({ workspaces: ['packages/*'] })),
    }

    return this.getIncludes(
      {
        cwd: projectCwdPortable,
        topLevelWorkspace,
        workspaces: [topLevelWorkspace],
      } as never,
      ['packages/*'],
      npath.toPortablePath(invocationCwd),
      npath.toPortablePath(typecheckCwd)
    )
  }
}

test('should leave workspace tsconfig include as config-owned scope', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-'))
  const workspaceCwd = join(cwd, 'client/next-app')
  const command = new TestTypeCheckCommand()

  await mkdir(workspaceCwd, { recursive: true })
  await writeFile(join(cwd, 'tsconfig.json'), '{"include":["server/**/*.ts"]}\n')
  await writeFile(
    join(workspaceCwd, 'tsconfig.json'),
    '{"include":["next-env.d.ts","src/**/*.ts"]}\n'
  )

  assert.equal(await command.resolveIncludes(cwd, workspaceCwd, workspaceCwd), undefined)
})

test('should preserve workspace tsconfig scope without include override', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-'))
  const workspaceCwd = join(cwd, 'client/next-app')
  const command = new TestTypeCheckCommand()

  await mkdir(workspaceCwd, { recursive: true })
  await writeFile(join(workspaceCwd, 'tsconfig.json'), '{"extends":"../../tsconfig.base.json"}\n')

  assert.equal(await command.resolveIncludes(cwd, workspaceCwd, workspaceCwd), undefined)
})

test('should resolve explicit typecheck targets from invocation cwd to typecheck root', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-'))
  const workspaceCwd = join(cwd, 'client/next-app')
  const invocationCwd = join(workspaceCwd, 'src/app')
  const command = new TestTypeCheckCommand()

  command.args = ['page.tsx']

  const input = await command.resolveIncludes(cwd, invocationCwd, workspaceCwd)

  assert.ok(input)
  assert.deepEqual(toCommandArguments(input, npath.toPortablePath(workspaceCwd)), [
    'src/app/page.tsx',
  ])
})

test('should use project workspace patterns when tsconfig is absent', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-'))
  const command = new TestTypeCheckCommand()

  const input = await command.resolveIncludes(cwd, cwd, cwd)

  assert.ok(input)
  assert.deepEqual(toCommandArguments(input), ['packages/*'])
})
