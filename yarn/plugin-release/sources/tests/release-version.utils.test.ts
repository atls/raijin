import type { Project }                    from '@yarnpkg/core'
import type { Workspace }                  from '@yarnpkg/core'
import type { PortablePath }               from '@yarnpkg/fslib'

import assert                              from 'node:assert/strict'
import { test }                            from 'node:test'

import { structUtils }                     from '@yarnpkg/core'
import { ppath }                           from '@yarnpkg/fslib'

import { resolveReleaseVersionStrategies } from '../release-version.utils.js'

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

test('should route internal workspace changes through public Raijin release workspace', () => {
  const project = createProject([rootWorkspace, runtimeWorkspace, cliWorkspace])

  const strategies = resolveReleaseVersionStrategies(project, [
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

  const strategies = resolveReleaseVersionStrategies(project, [
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

test('should default touched Raijin workspace changes to patch strategy', () => {
  const project = createProject([rootWorkspace, runtimeWorkspace, cliWorkspace])

  const strategies = resolveReleaseVersionStrategies(project, [
    {
      message: 'update docs',
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
