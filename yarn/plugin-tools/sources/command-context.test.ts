import assert                             from 'node:assert/strict'
import { dirname }                        from 'node:path'
import { resolve }                        from 'node:path'
import test                               from 'node:test'
import { fileURLToPath }                  from 'node:url'

import { getPluginConfiguration }         from '@yarnpkg/cli'
import { npath }                          from '@yarnpkg/fslib'
import { ppath }                          from '@yarnpkg/fslib'

import { resolveProjectCommandContext }   from './command-context.js'
import { resolveWorkspaceCommandContext } from './command-context.js'

const repoRoot = npath.toPortablePath(resolve(dirname(fileURLToPath(import.meta.url)), '../../..'))
const rendererWorkspaceCwd = ppath.join(repoRoot, 'yarn/plugin-renderer')
const rendererNestedCwd = ppath.join(rendererWorkspaceCwd, 'sources/commands')

test('should resolve project command context from a nested cwd', async () => {
  const context = await resolveProjectCommandContext(rendererNestedCwd, getPluginConfiguration())

  assert.equal(context.invocationCwd, rendererNestedCwd)
  assert.equal(context.project.cwd, repoRoot)
})

test('should resolve workspace command context from a workspace root', async () => {
  const context = await resolveWorkspaceCommandContext(
    rendererWorkspaceCwd,
    getPluginConfiguration()
  )

  assert.equal(context.invocationCwd, rendererWorkspaceCwd)
  assert.equal(context.workspaceCwd, rendererWorkspaceCwd)
  assert.equal(context.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
})

test('should resolve workspace command context from a nested cwd', async () => {
  const context = await resolveWorkspaceCommandContext(rendererNestedCwd, getPluginConfiguration())

  assert.equal(context.invocationCwd, rendererNestedCwd)
  assert.equal(context.workspaceCwd, rendererWorkspaceCwd)
  assert.equal(context.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
})
