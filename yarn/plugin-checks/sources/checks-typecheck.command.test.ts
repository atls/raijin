import type { CommandInput }      from '@atls/raijin/commands'

import assert                     from 'node:assert/strict'
import { mkdtemp }                from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { tmpdir }                 from 'node:os'
import { join }                   from 'node:path'
import test                       from 'node:test'

import { Manifest }               from '@yarnpkg/core'
import { npath }                  from '@yarnpkg/fslib'

import { toCommandArguments }     from '@atls/raijin/commands'

import { ChecksTypeCheckCommand } from './checks-typecheck.command.jsx'

class TestChecksTypeCheckCommand extends ChecksTypeCheckCommand {
  async resolveInput(cwd: string): Promise<CommandInput | undefined> {
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
      ['packages/*']
    )
  }
}

test('should use project workspace patterns when tsconfig is absent', async () => {
  const command = new TestChecksTypeCheckCommand()

  command.changed = false

  const input = await command.resolveInput('/repo')

  assert.ok(input)
  assert.deepEqual(toCommandArguments(input), ['packages/*'])
})

test('should leave project tsconfig scope to typecheck', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-checks-typecheck-'))
  const command = new TestChecksTypeCheckCommand()

  await writeFile(join(cwd, 'tsconfig.json'), '{"files":[],"references":[]}\n')
  command.changed = false

  assert.equal(await command.resolveInput(cwd), undefined)
})
