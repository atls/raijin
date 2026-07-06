import assert                             from 'node:assert/strict'
import { dirname }                        from 'node:path'
import { resolve }                        from 'node:path'
import test                               from 'node:test'
import { fileURLToPath }                  from 'node:url'

import { getPluginConfiguration }         from '@yarnpkg/cli'
import { npath }                          from '@yarnpkg/fslib'
import { ppath }                          from '@yarnpkg/fslib'

import { COMMAND_INVOCATION_CWD }         from './command-context.js'
import { createCommandProxyEnvironment }  from './command-context.js'
import { resolveProjectCommandContext }   from './command-context.js'
import { resolveWorkspaceCommandContext } from './command-context.js'

const repoRoot = npath.toPortablePath(resolve(dirname(fileURLToPath(import.meta.url)), '../../..'))
const rendererWorkspaceCwd = ppath.join(repoRoot, 'yarn/plugin-renderer')
const rendererNestedCwd = ppath.join(rendererWorkspaceCwd, 'sources/commands')

const withCommandEnvironment = async (
  env: {
    initCwd?: string
    invocationCwd?: string
  },
  callback: () => Promise<void> | void
): Promise<void> => {
  const previousInitCwd = process.env.INIT_CWD
  const previousInvocationCwd = process.env[COMMAND_INVOCATION_CWD]

  try {
    if (env.initCwd === undefined) {
      delete process.env.INIT_CWD
    } else {
      process.env.INIT_CWD = env.initCwd
    }

    if (env.invocationCwd === undefined) {
      delete process.env.RAIJIN_COMMAND_INVOCATION_CWD
    } else {
      process.env[COMMAND_INVOCATION_CWD] = env.invocationCwd
    }

    await callback()
  } finally {
    if (previousInitCwd === undefined) {
      delete process.env.INIT_CWD
    } else {
      process.env.INIT_CWD = previousInitCwd
    }

    if (previousInvocationCwd === undefined) {
      delete process.env.RAIJIN_COMMAND_INVOCATION_CWD
    } else {
      process.env[COMMAND_INVOCATION_CWD] = previousInvocationCwd
    }
  }
}

test('should resolve project command context from a nested cwd', async () => {
  await withCommandEnvironment({}, async () => {
    const context = await resolveProjectCommandContext(rendererNestedCwd, getPluginConfiguration())

    assert.equal(context.invocationCwd, rendererNestedCwd)
    assert.equal(context.project.cwd, repoRoot)
  })
})

test('should resolve workspace command context from a workspace root', async () => {
  await withCommandEnvironment({}, async () => {
    const context = await resolveWorkspaceCommandContext(
      rendererWorkspaceCwd,
      getPluginConfiguration()
    )

    assert.equal(context.invocationCwd, rendererWorkspaceCwd)
    assert.equal(context.workspaceCwd, rendererWorkspaceCwd)
    assert.equal(context.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
  })
})

test('should resolve workspace command context from a nested cwd', async () => {
  await withCommandEnvironment({}, async () => {
    const context = await resolveWorkspaceCommandContext(
      rendererNestedCwd,
      getPluginConfiguration()
    )

    assert.equal(context.invocationCwd, rendererNestedCwd)
    assert.equal(context.workspaceCwd, rendererWorkspaceCwd)
    assert.equal(context.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
  })
})

test('should preserve original invocation cwd across proxy re-entry', async () => {
  await withCommandEnvironment({ invocationCwd: rendererNestedCwd }, async () => {
    const context = await resolveWorkspaceCommandContext(repoRoot, getPluginConfiguration())

    assert.equal(context.invocationCwd, rendererNestedCwd)
    assert.equal(context.workspaceCwd, rendererWorkspaceCwd)
    assert.equal(context.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
  })
})

test('should resolve original invocation cwd from yarn init cwd', async () => {
  await withCommandEnvironment({ initCwd: rendererNestedCwd }, async () => {
    const context = await resolveWorkspaceCommandContext(repoRoot, getPluginConfiguration())

    assert.equal(context.invocationCwd, rendererNestedCwd)
    assert.equal(context.workspaceCwd, rendererWorkspaceCwd)
    assert.equal(context.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
  })
})

test('should create proxy environment with preserved invocation cwd', async () => {
  await withCommandEnvironment({}, () => {
    const env = createCommandProxyEnvironment(rendererNestedCwd)

    assert.equal(env.COMMAND_PROXY_EXECUTION, 'true')
    assert.equal(env.RAIJIN_COMMAND_INVOCATION_CWD, npath.fromPortablePath(rendererNestedCwd))
  })
})

test('should create proxy environment from yarn init cwd', async () => {
  await withCommandEnvironment({ initCwd: rendererNestedCwd }, () => {
    const env = createCommandProxyEnvironment(repoRoot)

    assert.equal(env.COMMAND_PROXY_EXECUTION, 'true')
    assert.equal(env.RAIJIN_COMMAND_INVOCATION_CWD, npath.fromPortablePath(rendererNestedCwd))
  })
})
