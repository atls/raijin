import assert               from 'node:assert/strict'
import { mkdir }            from 'node:fs/promises'
import { mkdtemp }          from 'node:fs/promises'
import { writeFile }        from 'node:fs/promises'
import { tmpdir }           from 'node:os'
import { join }             from 'node:path'
import { test }             from 'node:test'

import { npath }            from '@yarnpkg/fslib'

import { TypeCheckCommand } from './typecheck.command.js'

class TestTypeCheckCommand extends TypeCheckCommand {
  async resolveIncludes(
    projectCwd: string,
    invocationCwd: string,
    typecheckCwd: string
  ): Promise<Array<string>> {
    return this.getIncludes(
      {
        cwd: npath.toPortablePath(projectCwd),
        topLevelWorkspace: {
          manifest: {
            workspaceDefinitions: [{ pattern: 'packages/*' }],
          },
        },
      } as never,
      npath.toPortablePath(invocationCwd),
      npath.toPortablePath(typecheckCwd)
    )
  }
}

test('should read includes from workspace tsconfig', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-'))
  const workspaceCwd = join(cwd, 'client/next-app')
  const command = new TestTypeCheckCommand()

  await mkdir(workspaceCwd, { recursive: true })
  await writeFile(join(cwd, 'tsconfig.json'), '{"include":["server/**/*.ts"]}\n')
  await writeFile(
    join(workspaceCwd, 'tsconfig.json'),
    '{"include":["next-env.d.ts","src/**/*.ts"]}\n'
  )

  assert.deepEqual(await command.resolveIncludes(cwd, workspaceCwd, workspaceCwd), [
    'next-env.d.ts',
    'src/**/*.ts',
  ])
})

test('should resolve explicit typecheck targets from invocation cwd to typecheck root', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-typecheck-'))
  const workspaceCwd = join(cwd, 'client/next-app')
  const invocationCwd = join(workspaceCwd, 'src/app')
  const command = new TestTypeCheckCommand()

  command.args = ['page.tsx']

  assert.deepEqual(await command.resolveIncludes(cwd, invocationCwd, workspaceCwd), [
    'src/app/page.tsx',
  ])
})
