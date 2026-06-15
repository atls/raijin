import type { Project }                 from '@yarnpkg/core'
import type { Workspace }               from '@yarnpkg/core'
import type { PortablePath }            from '@yarnpkg/fslib'

import assert                           from 'node:assert/strict'
import { test }                         from 'node:test'

import { structUtils }                  from '@yarnpkg/core'
import { ppath }                        from '@yarnpkg/fslib'

import { createReleasePlan }            from '../release-plan.utils.js'
import { parseReleasePlan }             from '../release-plan.utils.js'
import { resolveReleasePlanStrategies } from '../release-plan.utils.js'

const createWorkspace = (
  ident: string,
  relativeCwd: string,
  version: string,
  isPrivate = false
): Workspace =>
  ({
    relativeCwd,
    manifest: {
      name: structUtils.parseIdent(ident),
      version,
      private: isPrivate,
      raw: {
        private: isPrivate,
      },
    },
  }) as unknown as Workspace

const runtimeWorkspace = createWorkspace('@atls/code-runtime', 'runtime/code-runtime', '2.1.33')
const cliWorkspace = createWorkspace('@atls/yarn-cli', 'yarn/cli', '1.1.96', true)
const rootWorkspace = createWorkspace('tools', '.', '1.0.0', true)
const projectCwd = '/repo' as PortablePath

const createProject = (workspaces: Array<Workspace>): Project =>
  ({
    cwd: projectCwd,
    workspaces,
    workspacesByCwd: new Map(
      workspaces.map((workspace) => [ppath.resolve(projectCwd, workspace.relativeCwd), workspace])
    ),
  }) as Project

test('should create a fixed release plan from selected workspace strategies', () => {
  const project = createProject([rootWorkspace, runtimeWorkspace, cliWorkspace])
  const strategies = resolveReleasePlanStrategies(project, [
    {
      message: 'feat(runtime): add loader',
      files: ['runtime/code-runtime/src/loader.ts'],
    },
    {
      message: 'fix(cli): repair publish route',
      files: ['yarn/cli/sources/index.ts'],
    },
  ])

  const plan = createReleasePlan(project, strategies, new Map([['@atls/code-runtime', 'major']]))

  assert.deepEqual(plan, {
    schemaVersion: 1,
    workspaces: [
      {
        ident: '@atls/code-runtime',
        relativeCwd: 'runtime/code-runtime',
        version: '3.0.0',
        strategy: 'major',
        private: false,
      },
      {
        ident: '@atls/yarn-cli',
        relativeCwd: 'yarn/cli',
        version: '1.1.97',
        strategy: 'patch',
        private: true,
      },
    ],
  })
})

test('should write target minor versions into release plan', () => {
  const project = createProject([rootWorkspace, runtimeWorkspace])
  const strategies = [
    {
      workspace: {
        ident: '@atls/code-runtime',
        relativeCwd: 'runtime/code-runtime',
      },
      strategy: 'patch',
    } as const,
  ]

  const plan = createReleasePlan(project, strategies, new Map([['@atls/code-runtime', 'minor']]))

  assert.deepEqual(plan.workspaces, [
    {
      ident: '@atls/code-runtime',
      relativeCwd: 'runtime/code-runtime',
      version: '2.2.0',
      strategy: 'minor',
      private: false,
    },
  ])
})

test('should write exact deferred versions into release plan', () => {
  const project = createProject([rootWorkspace, cliWorkspace])
  const strategies = [
    {
      workspace: {
        ident: '@atls/yarn-cli',
        relativeCwd: 'yarn/cli',
      },
      strategy: 'patch',
    } as const,
  ]

  const plan = createReleasePlan(project, strategies, new Map([['@atls/yarn-cli', '1.5.0']]))

  assert.deepEqual(plan.workspaces, [
    {
      ident: '@atls/yarn-cli',
      relativeCwd: 'yarn/cli',
      version: '1.5.0',
      strategy: '1.5.0',
      private: true,
    },
  ])
})

test('should preserve deferred version ranges in release plan', () => {
  const project = createProject([rootWorkspace, cliWorkspace])
  const strategies = [
    {
      workspace: {
        ident: '@atls/yarn-cli',
        relativeCwd: 'yarn/cli',
      },
      strategy: 'patch',
    } as const,
  ]

  const plan = createReleasePlan(project, strategies, new Map([['@atls/yarn-cli', '^2.0.0']]))

  assert.deepEqual(plan.workspaces, [
    {
      ident: '@atls/yarn-cli',
      relativeCwd: 'yarn/cli',
      version: '^2.0.0',
      strategy: '^2.0.0',
      private: true,
    },
  ])
})

test('should write prerelease strategy target versions into release plan', () => {
  const prereleaseWorkspace = createWorkspace(
    '@atls/code-runtime',
    'runtime/code-runtime',
    '2.1.33-alpha.0'
  )
  const project = createProject([rootWorkspace, prereleaseWorkspace, cliWorkspace])
  const strategies = [
    {
      workspace: {
        ident: '@atls/code-runtime',
        relativeCwd: 'runtime/code-runtime',
      },
      strategy: 'patch',
    } as const,
    {
      workspace: {
        ident: '@atls/yarn-cli',
        relativeCwd: 'yarn/cli',
      },
      strategy: 'patch',
    } as const,
  ]
  const deferredDecisions = new Map([
    ['@atls/code-runtime', 'prerelease'],
    ['@atls/yarn-cli', 'preminor'],
  ])

  const plan = createReleasePlan(project, strategies, deferredDecisions)

  assert.deepEqual(plan.workspaces, [
    {
      ident: '@atls/code-runtime',
      relativeCwd: 'runtime/code-runtime',
      version: '2.1.33-alpha.1',
      strategy: 'prerelease',
      private: false,
    },
    {
      ident: '@atls/yarn-cli',
      relativeCwd: 'yarn/cli',
      version: '1.2.0-0',
      strategy: 'preminor',
      private: true,
    },
  ])
})

test('should reject malformed release plan content', () => {
  assert.throws(() => parseReleasePlan('{"schemaVersion":1,"workspaces":[{"ident":"pkg"}]}'), {
    message: 'Invalid release plan',
  })
})

test('should parse valid release plan content', () => {
  assert.deepEqual(
    parseReleasePlan(
      JSON.stringify({
        schemaVersion: 1,
        workspaces: [
          {
            ident: '@atls/yarn-cli',
            relativeCwd: 'yarn/cli',
            version: '1.1.96',
            strategy: 'patch',
            private: true,
          },
        ],
      })
    ),
    {
      schemaVersion: 1,
      workspaces: [
        {
          ident: '@atls/yarn-cli',
          relativeCwd: 'yarn/cli',
          version: '1.1.96',
          strategy: 'patch',
          private: true,
        },
      ],
    }
  )
})
