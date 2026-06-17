import type { Project }                 from '@yarnpkg/core'
import type { Workspace }               from '@yarnpkg/core'

import assert                           from 'node:assert/strict'
import { test }                         from 'node:test'

import { createChecksReleaseProxyArgs } from './checks-release.command.js'
import { isReleaseWorkspaceAllowed }    from './checks-release.config.js'
import { resolveChecksReleaseConfig }   from './checks-release.config.js'

const createProject = (tools?: Record<string, unknown>): Project =>
  ({
    topLevelWorkspace: {
      manifest: {
        raw: {
          tools,
        },
      },
    },
  }) as unknown as Project

const createWorkspace = (isPrivate: boolean): Workspace =>
  ({
    manifest: {
      private: isPrivate,
    },
  }) as Workspace

test('should keep release checks enabled by default', () => {
  assert.deepEqual(resolveChecksReleaseConfig(createProject()), {
    enabled: true,
    privateWorkspaces: true,
  })
})

test('should disable release checks from top-level tools config', () => {
  assert.deepEqual(
    resolveChecksReleaseConfig(
      createProject({
        checks: {
          release: false,
        },
      })
    ),
    {
      enabled: false,
      privateWorkspaces: true,
    }
  )
})

test('should disable private release workspaces from top-level tools config', () => {
  assert.deepEqual(
    resolveChecksReleaseConfig(
      createProject({
        checks: {
          release: {
            privateWorkspaces: false,
          },
        },
      })
    ),
    {
      enabled: true,
      privateWorkspaces: false,
    }
  )
})

test('should filter private release workspaces only when configured', () => {
  assert.equal(
    isReleaseWorkspaceAllowed(createWorkspace(true), {
      enabled: true,
      privateWorkspaces: true,
    }),
    true
  )
  assert.equal(
    isReleaseWorkspaceAllowed(createWorkspace(true), {
      enabled: true,
      privateWorkspaces: false,
    }),
    false
  )
  assert.equal(
    isReleaseWorkspaceAllowed(createWorkspace(false), {
      enabled: true,
      privateWorkspaces: false,
    }),
    true
  )
})

test('should preserve private workspace filter across proxy execution', () => {
  assert.deepEqual(createChecksReleaseProxyArgs(false), ['checks', 'release'])
  assert.deepEqual(createChecksReleaseProxyArgs(true), ['checks', 'release', '--no-private'])
})
