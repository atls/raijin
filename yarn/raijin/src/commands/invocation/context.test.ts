import assert                                from 'node:assert/strict'
import { dirname }                           from 'node:path'
import { resolve }                           from 'node:path'
import test                                  from 'node:test'
import { fileURLToPath }                     from 'node:url'

import { getPluginConfiguration }            from '@yarnpkg/cli'
import { npath }                             from '@yarnpkg/fslib'
import { ppath }                             from '@yarnpkg/fslib'

import { COMMAND_INVOCATION_CWD }            from './proxy-state.js'
import { COMMAND_PROXY_EXECUTION }           from './proxy-state.js'
import { resolveProjectCommandInvocation }   from './context.js'
import { resolveWorkspaceCommandInvocation } from './context.js'
import { createCommandProxyEnvironment }     from './proxy-state.js'

const repoRoot = npath.toPortablePath(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
)
const rendererWorkspaceCwd = ppath.join(repoRoot, 'yarn/plugin-renderer')
const rendererNestedCwd = ppath.join(rendererWorkspaceCwd, 'sources/commands')

test('should resolve project command invocation from a nested cwd', async () => {
  const invocation = await resolveProjectCommandInvocation(
    rendererNestedCwd,
    getPluginConfiguration(),
    {}
  )

  assert.equal(invocation.cwd.invocation.portable, rendererNestedCwd)
  assert.equal(invocation.cwd.invocation.native, npath.fromPortablePath(rendererNestedCwd))
  assert.equal(invocation.cwd.execution.portable, repoRoot)
  assert.equal(invocation.cwd.execution.native, npath.fromPortablePath(repoRoot))
  assert.equal(invocation.cwd.execution, invocation.cwd.project)
  assert.equal(invocation.project.cwd, repoRoot)
})

test('should resolve workspace execution cwd without a duplicate workspace cwd field', async () => {
  const invocation = await resolveWorkspaceCommandInvocation(
    rendererNestedCwd,
    getPluginConfiguration(),
    {}
  )

  assert.equal(invocation.cwd.invocation.portable, rendererNestedCwd)
  assert.equal(invocation.cwd.execution.portable, rendererWorkspaceCwd)
  assert.equal(invocation.cwd.execution.native, npath.fromPortablePath(rendererWorkspaceCwd))
  assert.equal(invocation.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
  assert.equal('workspaceCwd' in invocation, false)
})

test('should consume proxy invocation state as one unit', async () => {
  const environment = createCommandProxyEnvironment(npath.fromPortablePath(rendererNestedCwd))
  const invocation = await resolveProjectCommandInvocation(
    repoRoot,
    getPluginConfiguration(),
    environment
  )

  assert.equal(invocation.cwd.invocation.portable, rendererNestedCwd)
  assert.equal(environment[COMMAND_PROXY_EXECUTION], undefined)
  assert.equal(environment[COMMAND_INVOCATION_CWD], undefined)

  const nestedInvocation = await resolveWorkspaceCommandInvocation(
    rendererWorkspaceCwd,
    getPluginConfiguration(),
    environment
  )

  assert.equal(nestedInvocation.cwd.invocation.portable, rendererWorkspaceCwd)
})

test('should ignore and clear a proxy cwd without its marker', async () => {
  const environment = {
    [COMMAND_INVOCATION_CWD]: npath.fromPortablePath(rendererNestedCwd),
  }
  const invocation = await resolveWorkspaceCommandInvocation(
    rendererWorkspaceCwd,
    getPluginConfiguration(),
    environment
  )

  assert.equal(invocation.cwd.invocation.portable, rendererWorkspaceCwd)
  assert.equal(environment[COMMAND_INVOCATION_CWD], undefined)
})

test('should reject and clear a proxy marker without its cwd', async () => {
  const environment = { [COMMAND_PROXY_EXECUTION]: 'true' }

  await assert.rejects(
    resolveProjectCommandInvocation(repoRoot, getPluginConfiguration(), environment),
    /Command proxy invocation cwd is missing/
  )
  assert.equal(environment[COMMAND_PROXY_EXECUTION], undefined)
})

test('should use a nested Yarn init cwd within the command cwd', async () => {
  const invocation = await resolveWorkspaceCommandInvocation(repoRoot, getPluginConfiguration(), {
    INIT_CWD: npath.fromPortablePath(rendererNestedCwd),
  })

  assert.equal(invocation.cwd.invocation.portable, rendererNestedCwd)
  assert.equal(invocation.cwd.execution.portable, rendererWorkspaceCwd)
})
