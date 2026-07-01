import type { Project }                 from '@yarnpkg/core'
import type { Workspace }               from '@yarnpkg/core'
import type { PortablePath }            from '@yarnpkg/fslib'

import type { ReleasePlanTarget }       from '../release-plan.utils.js'

import assert                           from 'node:assert/strict'
import { test }                         from 'node:test'

import { structUtils }                  from '@yarnpkg/core'
import { ppath }                        from '@yarnpkg/fslib'
import { versionUtils }                 from '@yarnpkg/plugin-version'

import { RELEASE_PLAN_SCHEMA_VERSION }  from '../release-plan.utils.js'
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

const runtimeWorkspace = createWorkspace('@atls/raijin', 'yarn/raijin', '2.1.33')
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
      files: ['yarn/raijin/src/loader.ts'],
    },
    {
      message: 'fix(cli): repair publish route',
      files: ['yarn/cli/sources/index.ts'],
    },
  ])
  const targets = new Map([
    ['@atls/raijin', createTarget(runtimeWorkspace)],
    ['@atls/yarn-cli', createTarget(cliWorkspace)],
  ])

  const plan = createReleasePlan(project, strategies, targets)

  assert.deepEqual(plan, {
    schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
    workspaces: [
      {
        ident: '@atls/yarn-cli',
        relativeCwd: 'yarn/cli',
        decision: 'release',
        private: true,
        publishable: false,
      },
      {
        ident: '@atls/raijin',
        relativeCwd: 'yarn/raijin',
        decision: 'release',
        private: false,
        publishable: true,
      },
    ],
  })
})

test('should include deferred-only workspaces in release plan', () => {
  const project = createProject([rootWorkspace, runtimeWorkspace, cliWorkspace])
  const strategies = [
    {
      workspace: {
        ident: '@atls/raijin',
        relativeCwd: 'yarn/raijin',
      },
      strategy: 'patch',
    } as const,
  ]
  const targets = new Map([
    ['@atls/raijin', createTarget(runtimeWorkspace)],
    ['@atls/yarn-cli', createTarget(cliWorkspace)],
  ])

  const plan = createReleasePlan(project, strategies, targets)

  assert.deepEqual(plan.workspaces, [
    {
      ident: '@atls/yarn-cli',
      relativeCwd: 'yarn/cli',
      decision: 'release',
      private: true,
      publishable: false,
    },
    {
      ident: '@atls/raijin',
      relativeCwd: 'yarn/raijin',
      decision: 'release',
      private: false,
      publishable: true,
    },
  ])
})

test('should require deferred target versions for changed workspaces', () => {
  const project = createProject([rootWorkspace, runtimeWorkspace])
  const strategies = [
    {
      workspace: {
        ident: '@atls/raijin',
        relativeCwd: 'yarn/raijin',
      },
      strategy: 'patch',
    } as const,
  ]

  assert.throws(() => createReleasePlan(project, strategies, new Map()), {
    message:
      'Release plan requires deferred target version for "@atls/raijin". ' +
      'Run `yarn release version defer` before `yarn release plan create`.',
  })
})

test('should not bump already applied manifest versions without deferred targets', () => {
  const appliedWorkspace = createWorkspace('@atls/raijin', 'yarn/raijin', '2.2.0')
  const project = createProject([rootWorkspace, appliedWorkspace])
  const strategies = [
    {
      workspace: {
        ident: '@atls/raijin',
        relativeCwd: 'yarn/raijin',
      },
      strategy: 'minor',
    } as const,
  ]

  assert.throws(() => createReleasePlan(project, strategies, new Map()), {
    message:
      'Release plan requires deferred target version for "@atls/raijin". ' +
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
      publishable: false,
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
      ['@atls/raijin', createTarget(runtimeWorkspace)],
      ['@atls/yarn-cli', createTarget(cliWorkspace)],
    ]
  )
})

test('should include declined deferred workspaces in release plan targets', async (context) => {
  const project = createProject([rootWorkspace, runtimeWorkspace, cliWorkspace])

  context.mock.method(versionUtils, 'resolveVersionFiles', async () => new Map())

  const targets = await resolveReleasePlanTargets(project, new Set(['@atls/raijin']))

  assert.deepEqual(
    [...targets.entries()],
    [['@atls/raijin', createTarget(runtimeWorkspace, 'decline')]]
  )
})

test('should prefer Yarn resolved targets over declined deferred fallbacks', async (context) => {
  const project = createProject([rootWorkspace, runtimeWorkspace, cliWorkspace])

  context.mock.method(
    versionUtils,
    'resolveVersionFiles',
    async () => new Map([[runtimeWorkspace, '2.2.0']])
  )

  const targets = await resolveReleasePlanTargets(project, new Set(['@atls/raijin']))

  assert.deepEqual([...targets.entries()], [['@atls/raijin', createTarget(runtimeWorkspace)]])
})

test('should reject legacy release plan schema content', () => {
  assert.throws(
    () =>
      parseReleasePlan(
        JSON.stringify({
          schemaVersion: 1,
          workspaces: [
            {
              ident: '@atls/yarn-cli',
              relativeCwd: 'yarn/cli',
              version: '1.1.97',
              strategy: '1.1.97',
              private: true,
              publishable: false,
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
        workspaces: [
          {
            ident: '@atls/yarn-cli',
            relativeCwd: 'yarn/cli',
            decision: 'release',
            private: true,
            publishable: false,
          },
        ],
      })
    ),
    {
      schemaVersion: RELEASE_PLAN_SCHEMA_VERSION,
      workspaces: [
        {
          ident: '@atls/yarn-cli',
          relativeCwd: 'yarn/cli',
          decision: 'release',
          private: true,
          publishable: false,
        },
      ],
    }
  )
})

test('should route internal workspace changes through public Raijin release workspace', () => {
  const project = createProject([rootWorkspace, runtimeWorkspace, cliWorkspace])

  const strategies = resolveReleasePlanStrategies(project, [
    {
      message: 'fix(cli): repair runtime bundle',
      files: ['yarn/cli/src/cli.ts'],
    },
  ])

  assert.deepEqual(strategies, [
    {
      workspace: {
        ident: '@atls/raijin',
        relativeCwd: 'yarn/raijin',
      },
      strategy: 'patch',
    },
  ])
})

test('should keep strongest strategy when internal and public changes share Raijin release', () => {
  const project = createProject([rootWorkspace, runtimeWorkspace, cliWorkspace])

  const strategies = resolveReleasePlanStrategies(project, [
    {
      message: 'fix(cli): repair runtime bundle',
      files: ['yarn/cli/src/cli.ts'],
    },
    {
      message: 'feat(runtime): expose public runtime contract',
      files: ['yarn/raijin/src/runtime.ts'],
    },
  ])

  assert.deepEqual(strategies, [
    {
      workspace: {
        ident: '@atls/raijin',
        relativeCwd: 'yarn/raijin',
      },
      strategy: 'minor',
    },
  ])
})
