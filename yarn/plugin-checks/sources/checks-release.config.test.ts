import type { ProjectCommandContext }  from '@atls/raijin/commands'
import type { ProjectInvocation }      from '@atls/raijin/commands'
import type { Project }                from '@yarnpkg/core'
import type { Workspace }              from '@yarnpkg/core'

import type { GitHubChecks }           from './github.checks.js'

import assert                          from 'node:assert/strict'
import { test }                        from 'node:test'

import { ChecksReleaseCommand }        from './checks-release.command.js'
import { createReleaseBuildArguments } from './checks-release.command.js'
import { isReleaseWorkspaceAllowed }   from './checks-release.config.js'
import { resolveChecksReleaseConfig }  from './checks-release.config.js'

test('runs unnamed root release builds through native foreach path selection', () => {
  assert.deepEqual(createReleaseBuildArguments({ path: '.' }), [
    'workspaces',
    'foreach',
    '--include',
    '.',
    '--all',
    'run',
    'build',
  ])
})

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

const createContext = (project: Project): ProjectCommandContext =>
  ({
    invocation: {
      yarn: { project },
    },
  }) as unknown as ProjectCommandContext

class TestChecksReleaseCommand extends ChecksReleaseCommand {
  readonly events: Array<unknown> = []

  resolutionError?: Error

  protected override createGitHubChecks(name: string): GitHubChecks {
    this.events.push(['create', name])

    return {
      start: async () => {
        this.events.push(['start'])

        return { id: 17 }
      },
      failure: async (output: unknown, id?: number) => {
        this.events.push(['failure', output, id])

        return {}
      },
      complete: async (id: number, output: unknown) => {
        this.events.push(['complete', id, output])

        return {}
      },
    } as unknown as GitHubChecks
  }

  protected override async resolveChangedProjectState(_invocation: ProjectInvocation) {
    this.events.push(['resolve'])

    if (this.resolutionError) {
      throw this.resolutionError
    }

    return { kind: 'error', reason: 'missing-token' } as const
  }

  protected override async reportManagedError(summary: string): Promise<number> {
    this.events.push(['report', summary])

    return 1
  }
}

test('publishes the named Release failure before returning a managed state error', async () => {
  const command = new TestChecksReleaseCommand()

  command.context = createContext(createProject())

  assert.equal(await command.execute(), 1)
  assert.deepEqual(command.events, [
    ['create', 'Release'],
    ['start'],
    ['resolve'],
    [
      'failure',
      {
        title: 'Release run failed',
        summary: 'Pull request changed state requires GITHUB_TOKEN',
      },
      17,
    ],
    ['report', 'Pull request changed state requires GITHUB_TOKEN'],
  ])
})

test('publishes and reports thrown post-start resolution failures', async () => {
  const command = new TestChecksReleaseCommand()

  command.context = createContext(createProject())
  command.resolutionError = new Error('Changed-state provider failed')

  assert.equal(await command.execute(), 1)
  assert.deepEqual(command.events, [
    ['create', 'Release'],
    ['start'],
    ['resolve'],
    [
      'failure',
      {
        title: 'Release run failed',
        summary: 'Changed-state provider failed',
      },
      17,
    ],
    ['report', 'Changed-state provider failed'],
  ])
})

test('keeps disabled release checks successful without resolving changed state', async () => {
  const command = new TestChecksReleaseCommand()

  command.context = createContext(createProject({ checks: { release: false } }))

  assert.equal(await command.execute(), 0)
  assert.deepEqual(command.events, [
    ['create', 'Release'],
    ['start'],
    [
      'complete',
      17,
      {
        title: 'Successful',
        summary: 'All checks passed',
        annotations: [],
      },
    ],
  ])
})

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
