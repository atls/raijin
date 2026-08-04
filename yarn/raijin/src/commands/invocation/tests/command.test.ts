/* eslint-disable max-classes-per-file */

import type { WorkspaceInvocation } from '../resolve.interfaces.js'

import assert                       from 'node:assert/strict'
import { dirname }                  from 'node:path'
import { before }                   from 'node:test'
import test                         from 'node:test'
import { fileURLToPath }            from 'node:url'

import { Configuration }            from '@yarnpkg/core'
import { Project }                  from '@yarnpkg/core'
import { getPluginConfiguration }   from '@yarnpkg/cli'
import { npath }                    from '@yarnpkg/fslib'
import { ppath }                    from '@yarnpkg/fslib'

import { RaijinCommand }            from '../command.js'

const testCwd = npath.toPortablePath(dirname(fileURLToPath(import.meta.url)))

let repoRoot = testCwd
let rendererNestedCwd = testCwd

before(async () => {
  const configuration = await Configuration.find(testCwd, getPluginConfiguration())
  const { project } = await Project.find(configuration, testCwd)

  repoRoot = project.cwd
  rendererNestedCwd = ppath.join(project.cwd, 'yarn/plugin-renderer/sources/commands')
})

test('should reject Raijin commands without exactly one invocation handler', async () => {
  class InvalidCommand extends RaijinCommand {}

  await assert.rejects(
    new InvalidCommand().execute(),
    /must implement exactly one Raijin command handler/
  )
})

test('should resolve a workspace invocation before command execution', async () => {
  let invocation: WorkspaceInvocation | undefined

  class WorkspaceCommand extends RaijinCommand {
    async executeWorkspace(commandInvocation: WorkspaceInvocation): Promise<number> {
      invocation = commandInvocation

      return 7
    }
  }

  const command = new WorkspaceCommand()

  command.context = {
    colorDepth: 8,
    cwd: rendererNestedCwd,
    env: {
      ...process.env,
      RAIJIN_PROJECT_RUNTIME: npath.fromPortablePath(repoRoot),
    },
    plugins: getPluginConfiguration(),
    quiet: false,
    stderr: process.stderr,
    stdin: process.stdin,
    stdout: process.stdout,
  }

  assert.equal(await command.execute(), 7)

  assert.ok(invocation)
  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(invocation.executionCwd, ppath.join(rendererNestedCwd, '../..'))
  assert.equal(invocation.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
})
