import assert                                from 'node:assert/strict'
import { dirname }                           from 'node:path'
import test                                  from 'node:test'
import { fileURLToPath }                     from 'node:url'

import { Configuration }                     from '@yarnpkg/core'
import { Project }                           from '@yarnpkg/core'
import { getPluginConfiguration }            from '@yarnpkg/cli'
import { npath }                             from '@yarnpkg/fslib'
import { ppath }                             from '@yarnpkg/fslib'
import { xfs }                               from '@yarnpkg/fslib'

import { NEXT_CONFIG_ADAPTER_PATH_ENV }      from '@atls/raijin/config/next'
import { RAIJIN_RENDERER_OUTPUT_ENV }        from '@atls/raijin/config/next'
import { RAIJIN_RENDERER_WORKSPACE_CWD_ENV } from '@atls/raijin/config/next'
import { MANAGED_NODE_LOADER_ENV }           from '@atls/raijin/runtime/node/bootstrap'

import { createNextExecutable }              from './executable.js'

const testCwd = npath.toPortablePath(dirname(fileURLToPath(import.meta.url)))

test('should create the renderer-owned Next execution environment', async () => {
  const configuration = await Configuration.find(testCwd, getPluginConfiguration())
  const { project } = await Project.find(configuration, testCwd)
  const workspace = project.getWorkspaceByCwd(ppath.join(project.cwd, 'yarn/plugin-renderer'))

  await xfs.mktempPromise(async (binFolder) => {
    const { env, executable } = await createNextExecutable({
      baseEnvironment: process.env,
      binFolder,
      locator: workspace.anchoredLocator,
      output: 'standalone',
      project,
      rendererCwd: workspace.cwd,
    })

    assert.equal(executable, process.platform === 'win32' ? 'yarn.cmd' : 'yarn')
    assert.equal(env.INIT_CWD, npath.fromPortablePath(workspace.cwd))
    assert.equal(env.PROJECT_CWD, npath.fromPortablePath(project.cwd))
    assert.equal(env[RAIJIN_RENDERER_WORKSPACE_CWD_ENV], npath.fromPortablePath(workspace.cwd))
    assert.equal(env[RAIJIN_RENDERER_OUTPUT_ENV], 'standalone')
    assert.ok(env[NEXT_CONFIG_ADAPTER_PATH_ENV])
    assert.ok(env[MANAGED_NODE_LOADER_ENV])
    assert.match(env.NODE_OPTIONS ?? '', /--import data:text\/javascript,/)
  })
})
