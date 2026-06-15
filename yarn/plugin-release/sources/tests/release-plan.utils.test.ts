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
        version: '2.1.33',
        strategy: 'major',
        private: false,
      },
      {
        ident: '@atls/yarn-cli',
        relativeCwd: 'yarn/cli',
        version: '1.1.96',
        strategy: 'patch',
        private: true,
      },
    ],
  })
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
