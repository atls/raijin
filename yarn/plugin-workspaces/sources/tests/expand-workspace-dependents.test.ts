import type { ChangedProjectState }   from '@atls/yarn-plugin-files'

import assert                         from 'node:assert/strict'
import { mkdir }                       from 'node:fs/promises'
import { mkdtemp }                     from 'node:fs/promises'
import { rm }                          from 'node:fs/promises'
import { writeFile }                   from 'node:fs/promises'
import { tmpdir }                      from 'node:os'
import { join }                        from 'node:path'
import { test }                        from 'node:test'

import { getPluginConfiguration }      from '@yarnpkg/cli'
import { Configuration }               from '@yarnpkg/core'
import { Project }                     from '@yarnpkg/core'

import { expandWorkspaceDependents }   from '../expand-workspace-dependents.js'

test('expands dependents separately from changed workspace discovery', async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-changed-workspaces-'))

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await writeFile(
    join(cwd, 'package.json'),
    JSON.stringify({ private: true, workspaces: ['packages/*'] })
  )
  await mkdir(join(cwd, 'packages/a'), { recursive: true })
  await mkdir(join(cwd, 'packages/b'), { recursive: true })
  await mkdir(join(cwd, 'packages/c'), { recursive: true })
  await writeFile(join(cwd, 'packages/a/package.json'), JSON.stringify({ name: '@fixture/a' }))
  await writeFile(
    join(cwd, 'packages/b/package.json'),
    JSON.stringify({ name: '@fixture/b', dependencies: { '@fixture/a': 'workspace:*' } })
  )
  await writeFile(
    join(cwd, 'packages/c/package.json'),
    JSON.stringify({ name: '@fixture/c', dependencies: { '@fixture/b': 'workspace:*' } })
  )

  const portableCwd = cwd as never
  const configuration = await Configuration.find(portableCwd, getPluginConfiguration())
  const { project } = await Project.find(configuration, portableCwd)
  const state: ChangedProjectState = {
    files: [{ path: 'packages/a/src/index.ts', status: 'modified' }],
    workspaces: [{ path: 'packages/a' }],
  }
  const expanded = expandWorkspaceDependents(project, state)

  assert.deepEqual(state.workspaces, [{ path: 'packages/a' }])
  assert.deepEqual(expanded.workspaces, [
    { path: 'packages/a' },
    { path: 'packages/b' },
    { path: 'packages/c' },
  ])
})
