import assert                         from 'node:assert/strict'
import { dirname }                    from 'node:path'
import { before }                     from 'node:test'
import test                           from 'node:test'
import { fileURLToPath }              from 'node:url'

import { Configuration }              from '@yarnpkg/core'
import { Project }                    from '@yarnpkg/core'
import { getPluginConfiguration }     from '@yarnpkg/cli'
import { npath }                      from '@yarnpkg/fslib'
import { ppath }                      from '@yarnpkg/fslib'

import { resolveProjectInvocation }   from './resolve.js'
import { resolveWorkspaceInvocation } from './resolve.js'

const testCwd = npath.toPortablePath(dirname(fileURLToPath(import.meta.url)))

let repoRoot = testCwd
let rendererWorkspaceCwd = testCwd
let rendererNestedCwd = testCwd

before(async () => {
  const configuration = await Configuration.find(testCwd, getPluginConfiguration())
  const { project } = await Project.find(configuration, testCwd)

  repoRoot = project.cwd
  rendererWorkspaceCwd = ppath.join(repoRoot, 'yarn/plugin-renderer')
  rendererNestedCwd = ppath.join(rendererWorkspaceCwd, 'sources/commands')
})

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

test('should use a nested Yarn init cwd within the command cwd', async () => {
  const invocation = await resolveWorkspaceInvocation(repoRoot, getPluginConfiguration(), {
    INIT_CWD: npath.fromPortablePath(rendererNestedCwd),
  })

  assert.equal(invocation.invocationCwd, rendererNestedCwd)
  assert.equal(invocation.executionCwd, rendererWorkspaceCwd)
})

test('should ignore a nested Yarn init cwd outside the command cwd', async () => {
  const invocation = await resolveWorkspaceInvocation(
    rendererWorkspaceCwd,
    getPluginConfiguration(),
    {
      INIT_CWD: npath.fromPortablePath(repoRoot),
    }
  )

  assert.equal(invocation.invocationCwd, rendererWorkspaceCwd)
  assert.equal(invocation.executionCwd, rendererWorkspaceCwd)
})
