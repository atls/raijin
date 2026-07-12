import assert                         from 'node:assert/strict'
import { dirname }                    from 'node:path'
import { resolve }                    from 'node:path'
import test                           from 'node:test'
import { fileURLToPath }              from 'node:url'

import { getPluginConfiguration }     from '@yarnpkg/cli'
import { npath }                      from '@yarnpkg/fslib'
import { ppath }                      from '@yarnpkg/fslib'

import { INVOCATION_CWD_ENV }         from './resolve.js'
import { PROXY_ENV }                  from './resolve.js'
import { createProxyEnvironment }     from './proxy.js'
import { resolveProjectInvocation }   from './resolve.js'
import { resolveWorkspaceInvocation } from './resolve.js'

const repoRoot = npath.toPortablePath(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
)
const rendererWorkspaceCwd = ppath.join(repoRoot, 'yarn/plugin-renderer')
const rendererNestedCwd = ppath.join(rendererWorkspaceCwd, 'sources/commands')

test('should resolve project command invocation from a nested cwd', async () => {
  const invocation = await resolveProjectInvocation(rendererNestedCwd, getPluginConfiguration(), {})

  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(invocation.executionCwd, repoRoot)
  assert.equal(invocation.project.cwd, repoRoot)
  assert.equal(invocation.yarn.project.cwd, repoRoot)
})

test('should resolve workspace execution cwd without a duplicate workspace cwd field', async () => {
  const invocation = await resolveWorkspaceInvocation(
    rendererNestedCwd,
    getPluginConfiguration(),
    {}
  )

  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(invocation.executionCwd, rendererWorkspaceCwd)
  assert.equal(invocation.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
  assert.equal('workspaceCwd' in invocation, false)
})

test('should consume proxy invocation state as one unit', async () => {
  const environment = createProxyEnvironment(rendererNestedCwd)
  const invocation = await resolveProjectInvocation(repoRoot, getPluginConfiguration(), environment)

  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(environment[PROXY_ENV], undefined)
  assert.equal(environment[INVOCATION_CWD_ENV], undefined)

  const nestedInvocation = await resolveWorkspaceInvocation(
    rendererWorkspaceCwd,
    getPluginConfiguration(),
    environment
  )

  assert.equal(nestedInvocation.invocationCwd, rendererWorkspaceCwd)
})

test('should ignore and clear a proxy cwd without its marker', async () => {
  const environment = {
    [INVOCATION_CWD_ENV]: npath.fromPortablePath(rendererNestedCwd),
  }
  const invocation = await resolveWorkspaceInvocation(
    rendererWorkspaceCwd,
    getPluginConfiguration(),
    environment
  )

  assert.equal(invocation.invocationCwd, rendererWorkspaceCwd)
  assert.equal(environment[INVOCATION_CWD_ENV], undefined)
})

test('should reject and clear a proxy marker without its cwd', async () => {
  const environment = { [PROXY_ENV]: 'true' }

  await assert.rejects(
    resolveProjectInvocation(repoRoot, getPluginConfiguration(), environment),
    /Command proxy invocation cwd is missing/
  )
  assert.equal(environment[PROXY_ENV], undefined)
})

test('should use a nested Yarn init cwd within the command cwd', async () => {
  const invocation = await resolveWorkspaceInvocation(repoRoot, getPluginConfiguration(), {
    INIT_CWD: npath.fromPortablePath(rendererNestedCwd),
  })

  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(invocation.executionCwd, rendererWorkspaceCwd)
})
