import type { Project }                 from '@yarnpkg/core'
import type { Workspace }               from '@yarnpkg/core'
import type { PortablePath }            from '@yarnpkg/fslib'

import type { ReleasePlanTarget }       from '../release-plan.utils.js'

import assert                           from 'node:assert/strict'
import { test }                         from 'node:test'

import { structUtils }                  from '@yarnpkg/core'
import { ppath }                        from '@yarnpkg/fslib'
import { versionUtils }                 from '@yarnpkg/plugin-version'

import { RELEASE_OWNERSHIP_CONTRACT }   from '../release-ownership.contract.js'
import { RELEASE_PLAN_SCHEMA_VERSION }  from '../release-ownership.contract.js'
import { createReleasePlan }            from '../release-plan.utils.js'
import { parseReleasePlan }             from '../release-plan.utils.js'
import { resolveReleasePlanStrategies } from '../release-plan.utils.js'
import { resolveReleasePlanTargets }    from '../release-plan.utils.js'

const createWorkspace = (
  ident: string,
  relativeCwd: string,
  version: string,
  isPrivate = false,
  raw: Record<string, unknown> = {}
): Workspace =>
  ({
    relativeCwd,
    manifest: {
      name: structUtils.parseIdent(ident),
      version,
      private: isPrivate,
      raw: {
        private: isPrivate,
        ...raw,
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

const createTarget = (
  workspace: Workspace,
  decision: ReleasePlanTarget['decision'] = 'release'
): ReleasePlanTarget => {
  if (!workspace.manifest.name) {
    throw new Error('Release plan target test workspace must have an ident')
  }

  return {
    workspace: {
      ident: structUtils.stringifyIdent(workspace.manifest.name),
      relativeCwd: workspace.relativeCwd,
    },
    decision,
  }
}

test('should create a release selection from Yarn deferred targets', () => {
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
  const targets = new Map([
    ['@atls/code-runtime', createTarget(runtimeWorkspace)],
    ['@atls/yarn-cli', createTarget(cliWorkspace)],
  ])

  const plan = createReleasePlan(project, strategies, targets)

  assert.deepEqual(plan, {
    schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
    ownership: RELEASE_OWNERSHIP_CONTRACT,
    workspaces: [
      {
        ident: '@atls/code-runtime',
        relativeCwd: 'runtime/code-runtime',
        decision: 'release',
        private: false,
      },
      {
        ident: '@atls/yarn-cli',
        relativeCwd: 'yarn/cli',
        decision: 'release',
        private: true,
      },
    ],
  })
})

test('should include deferred-only workspaces in release plan', () => {
  const project = createProject([rootWorkspace, runtimeWorkspace, cliWorkspace])
  const strategies = [
    {
      workspace: {
        ident: '@atls/code-runtime',
        relativeCwd: 'runtime/code-runtime',
      },
      strategy: 'patch',
    } as const,
  ]
  const targets = new Map([
    ['@atls/code-runtime', createTarget(runtimeWorkspace)],
    ['@atls/yarn-cli', createTarget(cliWorkspace)],
  ])

  const plan = createReleasePlan(project, strategies, targets)

  assert.deepEqual(plan.workspaces, [
    {
      ident: '@atls/code-runtime',
      relativeCwd: 'runtime/code-runtime',
      decision: 'release',
      private: false,
    },
    {
      ident: '@atls/yarn-cli',
      relativeCwd: 'yarn/cli',
      decision: 'release',
      private: true,
    },
  ])
})

test('should require deferred target versions for changed workspaces', () => {
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

  assert.throws(() => createReleasePlan(project, strategies, new Map()), {
    message:
      'Release plan requires deferred target version for "@atls/code-runtime". ' +
      'Run `yarn release version defer` before `yarn release plan create`.',
  })
})

test('should not bump already applied manifest versions without deferred targets', () => {
  const appliedWorkspace = createWorkspace('@atls/code-runtime', 'runtime/code-runtime', '2.2.0')
  const project = createProject([rootWorkspace, appliedWorkspace])
  const strategies = [
    {
      workspace: {
        ident: '@atls/code-runtime',
        relativeCwd: 'runtime/code-runtime',
      },
      strategy: 'minor',
    } as const,
  ]

  assert.throws(() => createReleasePlan(project, strategies, new Map()), {
    message:
      'Release plan requires deferred target version for "@atls/code-runtime". ' +
      'Run `yarn release version defer` before `yarn release plan create`.',
  })
})

test('should not copy Yarn target versions into release plan state', () => {
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
  const targets = new Map([['@atls/yarn-cli', createTarget(cliWorkspace)]])

  const plan = createReleasePlan(project, strategies, targets)

  assert.deepEqual(plan.workspaces, [
    {
      ident: '@atls/yarn-cli',
      relativeCwd: 'yarn/cli',
      decision: 'release',
      private: true,
    },
  ])

  assert.equal('version' in plan.workspaces[0], false)
})

test('should resolve release plan targets through Yarn version files', async (context) => {
  const project = createProject([rootWorkspace, runtimeWorkspace, cliWorkspace])

  context.mock.method(
    versionUtils,
    'resolveVersionFiles',
    async () =>
      new Map([
        [runtimeWorkspace, '2.2.0'],
        [rootWorkspace, '1.0.1'],
        [cliWorkspace, '1.2.0'],
      ])
  )

  const targets = await resolveReleasePlanTargets(project)

  assert.deepEqual(
    [...targets.entries()],
    [
      ['@atls/code-runtime', createTarget(runtimeWorkspace)],
      ['@atls/yarn-cli', createTarget(cliWorkspace)],
    ]
  )
})

test('should include declined deferred workspaces in release plan targets', async (context) => {
  const project = createProject([rootWorkspace, runtimeWorkspace, cliWorkspace])

  context.mock.method(versionUtils, 'resolveVersionFiles', async () => new Map())

  const targets = await resolveReleasePlanTargets(project, new Set(['@atls/code-runtime']))

  assert.deepEqual(
    [...targets.entries()],
    [['@atls/code-runtime', createTarget(runtimeWorkspace, 'decline')]]
  )
})

test('should prefer Yarn resolved targets over declined deferred fallbacks', async (context) => {
  const project = createProject([rootWorkspace, runtimeWorkspace, cliWorkspace])

  context.mock.method(
    versionUtils,
    'resolveVersionFiles',
    async () => new Map([[runtimeWorkspace, '2.2.0']])
  )

  const targets = await resolveReleasePlanTargets(project, new Set(['@atls/code-runtime']))

  assert.deepEqual([...targets.entries()], [['@atls/code-runtime', createTarget(runtimeWorkspace)]])
})

test('should reject release plan content without ownership contract', () => {
  assert.throws(
    () =>
      parseReleasePlan(
        JSON.stringify({
          schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
          workspaces: [],
        })
      ),
    {
      message: 'Invalid release plan',
    }
  )
})

test('should reject legacy release plan schema content', () => {
  assert.throws(
    () =>
      parseReleasePlan(
        JSON.stringify({
          schemaVersion: 1,
          ownership: RELEASE_OWNERSHIP_CONTRACT,
          workspaces: [
            {
              ident: '@atls/yarn-cli',
              relativeCwd: 'yarn/cli',
              version: '1.1.97',
              strategy: '1.1.97',
              private: true,
            },
          ],
        })
      ),
    {
      message: 'Invalid release plan',
    }
  )
})

test('should reject malformed release plan content', () => {
  assert.throws(
    () =>
      parseReleasePlan(
        JSON.stringify({
          schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
          ownership: RELEASE_OWNERSHIP_CONTRACT,
          workspaces: [
            {
              ident: 'pkg',
            },
          ],
        })
      ),
    {
      message: 'Invalid release plan',
    }
  )
})

test('should parse valid release plan content', () => {
  assert.deepEqual(
    parseReleasePlan(
      JSON.stringify({
        schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
        ownership: RELEASE_OWNERSHIP_CONTRACT,
        workspaces: [
          {
            ident: '@atls/yarn-cli',
            relativeCwd: 'yarn/cli',
            decision: 'release',
            private: true,
          },
        ],
      })
    ),
    {
      schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
      ownership: RELEASE_OWNERSHIP_CONTRACT,
      workspaces: [
        {
          ident: '@atls/yarn-cli',
          relativeCwd: 'yarn/cli',
          decision: 'release',
          private: true,
        },
      ],
    }
  )
})
