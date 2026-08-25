import type { ProjectProcessInvocation } from '@atls/raijin/commands'
import type { Project }                  from '@yarnpkg/core'
import type { Workspace }                from '@yarnpkg/core'

import assert                            from 'node:assert/strict'
import { test }                          from 'node:test'

import { resolveChangedProjectState }    from '../resolve.js'
import { resolveChangedProjectStateForEntrypoint } from '../resolve.js'
import { resolveProjectWorkspaces }      from '../workspaces.js'

const createProject = (): Project => {
  const root = { relativeCwd: '.', manifest: { name: null } } as unknown as Workspace
  const app = { relativeCwd: 'packages/app' } as Workspace
  const appTools = { relativeCwd: 'packages/app-tools' } as Workspace

  return {
    cwd: '/project',
    workspaces: [root, app, appTools],
  } as Project
}

test('keeps an empty explicit source as an empty result without provider fallback', async () => {
  const calls: Array<ReadonlyArray<string>> = []
  const processInvocation = {
    project: {
      execute: async (_command: string, args: ReadonlyArray<string>) => {
        calls.push(args)

        return { reason: 'completed', exitCode: 0, stdout: '', stderr: '' }
      },
    },
  } as unknown as ProjectProcessInvocation
  const result = await resolveChangedProjectState({
    kind: 'git',
    processInvocation,
    project: createProject(),
    source: { kind: 'git-range', base: 'origin/main', head: 'HEAD' },
  })

  assert.deepEqual(result, {
    kind: 'completed',
    state: { files: [], workspaces: [] },
  })
  assert.deepEqual(calls, [
    ['rev-parse', '--verify', '--quiet', '--end-of-options', 'origin/main^{commit}'],
    ['rev-parse', '--verify', '--quiet', '--end-of-options', 'HEAD^{commit}'],
    [
      'diff',
      '--name-status',
      '-z',
      '--find-renames',
      '--end-of-options',
      'origin/main...HEAD',
      '--',
    ],
  ])
})

test('explicit since entrypoint never reads the GitHub environment', async () => {
  const processInvocation = {
    project: {
      execute: async () => ({ reason: 'completed', exitCode: 0, stdout: '', stderr: '' }),
    },
  } as unknown as ProjectProcessInvocation
  const result = await resolveChangedProjectStateForEntrypoint({
    processInvocation,
    project: createProject(),
    since: 'origin/main',
    readEvent: () => {
      throw new Error('GitHub event must not be read')
    },
  })

  assert.equal(result.kind, 'completed')
})

test('returns missing GitHub credential from the entrypoint as a managed error', async () => {
  const previousToken = process.env.GITHUB_TOKEN
  const processInvocation = {
    project: {
      execute: async (): Promise<never> => {
        throw new Error('Git must not be called for a pull request source')
      },
    },
  } as unknown as ProjectProcessInvocation

  delete process.env.GITHUB_TOKEN

  try {
    const result = await resolveChangedProjectStateForEntrypoint({
      processInvocation,
      project: createProject(),
      readEvent: () => ({
        name: 'pull_request',
        repository: { owner: 'atls', repo: 'raijin' },
        pullRequest: { base: 'base-sha', head: 'head-sha', number: 852 },
      }),
    })

    assert.deepEqual(result, { kind: 'error', reason: 'missing-token' })
  } finally {
    if (previousToken === undefined) {
      delete process.env.GITHUB_TOKEN
    } else {
      process.env.GITHUB_TOKEN = previousToken
    }
  }
})

test('resolves a pull request through its required provider input', async () => {
  const processInvocation = {
    project: {
      execute: async (): Promise<never> => {
        throw new Error('Git must not be called for a pull request source')
      },
    },
  } as unknown as ProjectProcessInvocation
  const result = await resolveChangedProjectState({
    kind: 'pull-request',
    processInvocation,
    project: createProject(),
    provider: {
      readMetadata: async () => ({ base: 'base-sha', head: 'head-sha' }),
      listFiles: async () => [],
    },
    source: {
      kind: 'pull-request',
      owner: 'atls',
      repo: 'raijin',
      number: 852,
      base: 'base-sha',
      head: 'head-sha',
    },
  })

  assert.deepEqual(result, {
    kind: 'completed',
    state: { files: [], workspaces: [] },
  })
})

test('maps files to stable nearest-workspace identities including unnamed root', async () => {
  const processInvocation = {
    project: {
      execute: async () => ({
        reason: 'completed',
        exitCode: 0,
        stdout:
          'R100\0packages/app/src/index.ts\0packages/app-tools/src/index.ts\0M\0README.md\0',
        stderr: '',
      }),
    },
  } as unknown as ProjectProcessInvocation
  const result = await resolveChangedProjectState({
    kind: 'git',
    processInvocation,
    project: createProject(),
    source: { kind: 'git-range', base: 'origin/main', head: 'HEAD' },
  })

  assert.equal(result.kind, 'completed')
  assert.deepEqual(result.state.workspaces, [
    { path: '.' },
    { path: 'packages/app' },
    { path: 'packages/app-tools' },
  ])
})

test('resolves unnamed root identity back through the Yarn project model', () => {
  const project = createProject()
  const [root] = resolveProjectWorkspaces(project, [{ path: '.' }])

  assert.equal(root, project.workspaces[0])
  assert.equal(root.manifest.name, null)
})
