import assert                                from 'node:assert/strict'
import { dirname }                           from 'node:path'
import { resolve }                           from 'node:path'
import test                                  from 'node:test'
import { fileURLToPath }                     from 'node:url'

import { getPluginConfiguration }            from '@yarnpkg/cli'
import { npath }                             from '@yarnpkg/fslib'
import { ppath }                             from '@yarnpkg/fslib'

import { COMMAND_INVOCATION_CWD }            from './context.js'
import { COMMAND_PROXY_EXECUTION }           from './context.js'
import { resolveInvocationCwd }              from './context.js'
import { resolveProjectCommandInvocation }   from './context.js'
import { resolveWorkspaceCommandInvocation } from './context.js'
import { createCommandProxyEnvironment }     from './proxy.js'

const repoRoot = npath.toPortablePath(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../../..')
)
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

test('should resolve project command invocation from a nested cwd', async () => {
  await withCommandEnvironment({}, async () => {
    const context = await resolveProjectCommandInvocation(
      rendererNestedCwd,
      getPluginConfiguration()
    )

    assert.equal(context.invocationCwd, rendererNestedCwd)
    assert.equal(context.executionCwd, repoRoot)
    assert.equal(context.project.cwd, repoRoot)
  })
})

test('should resolve workspace command invocation from a workspace root', async () => {
  await withCommandEnvironment({}, async () => {
    const context = await resolveWorkspaceCommandInvocation(
      rendererWorkspaceCwd,
      getPluginConfiguration()
    )

    assert.equal(context.invocationCwd, rendererWorkspaceCwd)
    assert.equal(context.executionCwd, rendererWorkspaceCwd)
    assert.equal(context.workspaceCwd, rendererWorkspaceCwd)
    assert.equal(context.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
  })
})

test('should resolve workspace command invocation from a nested cwd', async () => {
  await withCommandEnvironment({}, async () => {
    const context = await resolveWorkspaceCommandInvocation(
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
    const context = await resolveWorkspaceCommandInvocation(repoRoot, getPluginConfiguration())

    assert.equal(context.invocationCwd, rendererNestedCwd)
    assert.equal(context.workspaceCwd, rendererWorkspaceCwd)
    assert.equal(context.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
  })
})

test('should consume proxy invocation state before resolving nested commands', async () => {
  const environment = createCommandProxyEnvironment(rendererNestedCwd)
  const proxyInvocation = await resolveProjectCommandInvocation(
    repoRoot,
    getPluginConfiguration(),
    environment
  )

  assert.equal(proxyInvocation.invocationCwd, rendererNestedCwd)
  assert.equal(environment[COMMAND_PROXY_EXECUTION], undefined)
  assert.equal(environment[COMMAND_INVOCATION_CWD], undefined)

  const nestedInvocation = await resolveWorkspaceCommandInvocation(
    rendererWorkspaceCwd,
    getPluginConfiguration(),
    environment
  )

  assert.equal(nestedInvocation.invocationCwd, rendererWorkspaceCwd)
  assert.equal(nestedInvocation.workspaceCwd, rendererWorkspaceCwd)
})

test('should resolve original invocation cwd from yarn init cwd', async () => {
  await withCommandEnvironment({ initCwd: rendererNestedCwd }, async () => {
    const context = await resolveWorkspaceCommandInvocation(repoRoot, getPluginConfiguration())

    assert.equal(context.invocationCwd, rendererNestedCwd)
    assert.equal(context.workspaceCwd, rendererWorkspaceCwd)
    assert.equal(context.workspace.manifest.raw.name, '@atls/yarn-plugin-renderer')
  })
})

test('should create proxy environment with preserved invocation cwd', async () => {
  await withCommandEnvironment({}, () => {
    const env = createCommandProxyEnvironment(resolveInvocationCwd(rendererNestedCwd))

    assert.equal(env.COMMAND_PROXY_EXECUTION, 'true')
    assert.equal(env.RAIJIN_COMMAND_INVOCATION_CWD, npath.fromPortablePath(rendererNestedCwd))
  })
})

test('should create proxy environment from yarn init cwd', async () => {
  await withCommandEnvironment({ initCwd: rendererNestedCwd }, () => {
    const env = createCommandProxyEnvironment(resolveInvocationCwd(repoRoot))

    assert.equal(env.COMMAND_PROXY_EXECUTION, 'true')
    assert.equal(env.RAIJIN_COMMAND_INVOCATION_CWD, npath.fromPortablePath(rendererNestedCwd))
  })
})
