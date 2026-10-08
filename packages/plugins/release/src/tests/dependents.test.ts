import assert                      from 'node:assert/strict'
import { mkdir }                   from 'node:fs/promises'
import { mkdtemp }                 from 'node:fs/promises'
import { rm }                      from 'node:fs/promises'
import { writeFile }               from 'node:fs/promises'
import { tmpdir }                  from 'node:os'
import { join }                    from 'node:path'
import { test }                    from 'node:test'

import { Configuration }           from '@yarnpkg/core'
import { Project }                 from '@yarnpkg/core'
import { getPluginConfiguration }  from '@yarnpkg/cli'
import { structUtils }             from '@yarnpkg/core'
import { npath }                   from '@yarnpkg/fslib'
import { versionUtils }            from '@yarnpkg/plugin-version'

import { inferDependentDecisions } from '../dependents.js'

const createProject = async (
  rootName: string | null = '@fixture/root'
): Promise<{ project: Project; root: string }> => {
  const root = await mkdtemp(join(tmpdir(), 'raijin-dependents-'))
  const packages = {
    a: { name: '@fixture/a', version: '1.0.0', dependencies: { '@fixture/b': 'workspace:^' } },
    b: { name: '@fixture/b', version: '1.0.0' },
    c: { name: '@fixture/c', version: '1.0.0', dependencies: { '@fixture/a': 'workspace:^' } },
  }

  await writeFile(
    join(root, 'package.json'),
    JSON.stringify({
      ...(rootName ? { name: rootName } : {}),
      private: true,
      version: '1.0.0',
      workspaces: ['packages/*'],
      dependencies: { '@fixture/c': 'workspace:^' },
    })
  )

  await Promise.all(
    Object.entries(packages).map(async ([folder, manifest]) => {
      await mkdir(join(root, 'packages', folder), { recursive: true })
      await writeFile(join(root, 'packages', folder, 'package.json'), JSON.stringify(manifest))
    })
  )

  const cwd = npath.toPortablePath(root)
  const configuration = await Configuration.find(cwd, getPluginConfiguration())
  const { project } = await Project.find(configuration, cwd)

  return { project, root }
}

test('uses Yarn dependency rules to bump public dependents and decline a private dependent', async (t) => {
  const { project, root } = await createProject()
  t.after(async () => rm(root, { recursive: true, force: true }))

  const b = project.getWorkspaceByIdent(structUtils.parseIdent('@fixture/b'))
  const decisions = inferDependentDecisions(
    project,
    new Set(),
    new Map(),
    new Map([[b, versionUtils.Decision.MINOR]])
  )

  assert.deepEqual(
    [...decisions].map(([workspace, decision]) => [
      structUtils.stringifyIdent(workspace.manifest.name!),
      decision,
    ]),
    [
      ['@fixture/b', versionUtils.Decision.MINOR],
      ['@fixture/a', versionUtils.Decision.PATCH],
      ['@fixture/c', versionUtils.Decision.PATCH],
      ['@fixture/root', versionUtils.Decision.DECLINE],
    ]
  )
})

test('preserves explicit decline and propagates an existing positive version decision', async (t) => {
  const { project, root } = await createProject()
  t.after(async () => rm(root, { recursive: true, force: true }))

  const b = project.getWorkspaceByIdent(structUtils.parseIdent('@fixture/b'))
  const decisions = inferDependentDecisions(
    project,
    new Set(['@fixture/a']),
    new Map([[b, '1.1.0']]),
    new Map()
  )

  assert.equal(decisions.size, 0)
})

test('does not write a decision for an unnamed private dependent root', async (t) => {
  const { project, root } = await createProject(null)
  t.after(async () => rm(root, { recursive: true, force: true }))

  const b = project.getWorkspaceByIdent(structUtils.parseIdent('@fixture/b'))
  const decisions = inferDependentDecisions(
    project,
    new Set(),
    new Map(),
    new Map([[b, versionUtils.Decision.MINOR]])
  )

  assert.deepEqual(
    [...decisions].map(([workspace]) => structUtils.stringifyIdent(workspace.manifest.name!)),
    ['@fixture/b', '@fixture/a', '@fixture/c']
  )
})
