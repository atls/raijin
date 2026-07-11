import assert                     from 'node:assert/strict'
import test                       from 'node:test'

import { Manifest }               from '@yarnpkg/core'
import { npath }                  from '@yarnpkg/fslib'

import { ChecksTypeCheckCommand } from './checks-typecheck.command.jsx'

class TestChecksTypeCheckCommand extends ChecksTypeCheckCommand {
  async resolveIncludes(cwd: string): Promise<Array<string>> {
    const projectCwd = npath.toPortablePath(cwd)
    const topLevelWorkspace = {
      cwd: projectCwd,
      manifest: Manifest.fromText(JSON.stringify({ workspaces: ['packages/*'] })),
    }

    return this.getIncludes({
      cwd: projectCwd,
      topLevelWorkspace,
      workspaces: [topLevelWorkspace],
    } as never)
  }
}

test('should use project workspace patterns when tsconfig is absent', async () => {
  const command = new TestChecksTypeCheckCommand()

  command.changed = false

  assert.deepEqual(await command.resolveIncludes('/repo'), ['packages/*'])
})
