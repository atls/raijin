import type { Project }       from '@yarnpkg/core'
import type { Workspace }     from '@yarnpkg/core'

import assert                 from 'node:assert/strict'
import { mkdir }              from 'node:fs/promises'
import { mkdtemp }            from 'node:fs/promises'
import { realpath }           from 'node:fs/promises'
import { rm }                 from 'node:fs/promises'
import { writeFile }          from 'node:fs/promises'
import { tmpdir }             from 'node:os'
import { join }               from 'node:path'
import { test }               from 'node:test'

import { createCommandInput } from '@atls/raijin/commands'
import { toPortableCwd }      from '@atls/raijin/commands'

import { selectTargetGroups } from '../selection.js'

test('groups package directories and files by their native Yarn workspaces', async (t) => {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), 'raijin-check-targets-')))
  const appCwd = join(cwd, 'packages/app')
  const libCwd = join(cwd, 'packages/lib')

  t.after(async () => rm(cwd, { recursive: true, force: true }))
  await mkdir(appCwd, { recursive: true })
  await mkdir(libCwd, { recursive: true })
  await writeFile(join(appCwd, 'source.ts'), 'export const app = true\n')
  await writeFile(join(libCwd, 'source.ts'), 'export const lib = true\n')

  const workspace = (path: string): Workspace => ({ cwd: toPortableCwd(path) }) as Workspace
  const root = workspace(cwd)
  const app = workspace(appCwd)
  const lib = workspace(libCwd)
  const project = {
    cwd: root.cwd,
    topLevelWorkspace: root,
    workspaces: [root, app, lib],
    tryWorkspaceByFilePath: (path: string) => {
      if (path.startsWith(app.cwd)) {
        return app
      }

      return path.startsWith(lib.cwd) ? lib : root
    },
  } as unknown as Project
  const input = createCommandInput({
    cwd: root.cwd,
    source: 'explicit',
    targets: ['packages/app', 'packages/lib/source.ts'],
  })

  const groups = await selectTargetGroups(project, input)

  assert.equal(groups.length, 2)
  assert.equal(groups[0]?.workspace, app)
  assert.deepEqual(
    groups[0]?.directories.targets.map(({ request }) => request),
    ['packages/app']
  )
  assert.deepEqual(groups[0]?.files.targets, [])
  assert.equal(groups[1]?.workspace, lib)
  assert.deepEqual(
    groups[1]?.files.targets.map(({ request }) => request),
    ['packages/lib/source.ts']
  )
  assert.deepEqual(groups[1]?.directories.targets, [])
})
