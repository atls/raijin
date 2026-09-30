import type { Project }                  from '@yarnpkg/core'
import type { Workspace }                from '@yarnpkg/core'

import assert                            from 'node:assert/strict'
import { mkdir }                         from 'node:fs/promises'
import { mkdtemp }                       from 'node:fs/promises'
import { realpath }                      from 'node:fs/promises'
import { rm }                            from 'node:fs/promises'
import { writeFile }                     from 'node:fs/promises'
import { tmpdir }                        from 'node:os'
import { join }                          from 'node:path'
import { test }                          from 'node:test'

import { createCommandInput }            from '@atls/raijin/commands'
import { toPortableCwd }                 from '@atls/raijin/commands'

import { selectTargetGroups }            from '../../targets/selection.js'
import { resolveProjectTypecheckScopes } from '../projects.js'
import { resolveTargetTypecheckScopes }  from '../projects.js'

const createProject = async (
  workspaceConfig: boolean
): Promise<{ cwd: string; project: Project }> => {
  const cwd = await realpath(await mkdtemp(join(tmpdir(), 'raijin-check-projects-')))
  const appCwd = join(cwd, 'packages/app')
  const libCwd = join(cwd, 'packages/lib')

  await mkdir(appCwd, { recursive: true })
  await mkdir(libCwd, { recursive: true })
  await writeFile(
    join(cwd, 'tsconfig.json'),
    JSON.stringify({
      include: ['packages/**/*.ts'],
    })
  )
  await writeFile(join(appCwd, 'source.ts'), 'export const app = true\n')
  await writeFile(join(libCwd, 'source.ts'), 'export const lib = true\n')

  if (workspaceConfig) {
    await writeFile(
      join(appCwd, 'tsconfig.json'),
      JSON.stringify({
        files: ['source.ts'],
      })
    )
  }

  const workspace = (path: string): Workspace =>
    ({
      cwd: toPortableCwd(path),
      manifest: { raw: {} },
    }) as Workspace
  const root = workspace(cwd)
  const app = workspace(appCwd)
  const lib = workspace(libCwd)
  const project = {
    cwd: root.cwd,
    topLevelWorkspace: root,
    workspaces: [root, app, lib],
    tryWorkspaceByFilePath: (path: string) => {
      if (path.startsWith(toPortableCwd(appCwd))) {
        return app
      }

      return path.startsWith(toPortableCwd(libCwd)) ? lib : root
    },
  } as unknown as Project

  return { cwd, project }
}

test('full-project check deduplicates a shared root TypeScript config', async (t) => {
  const { cwd, project } = await createProject(false)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const scopes = await resolveProjectTypecheckScopes(project)

  assert.equal(scopes.length, 1)
  assert.equal(scopes[0]?.cwd, cwd)
})

test('full-project check includes an independent workspace TypeScript config', async (t) => {
  const { cwd, project } = await createProject(true)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const scopes = await resolveProjectTypecheckScopes(project)

  assert.deepEqual(
    scopes.map(({ cwd: scopeCwd }) => scopeCwd),
    [cwd, join(cwd, 'packages/app')]
  )
})

test('package directory uses its complete TypeScript project, not a file root', async (t) => {
  const { cwd, project } = await createProject(true)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const input = createCommandInput({
    cwd: project.cwd,
    source: 'explicit',
    targets: ['packages/app', 'packages/app/source.ts'],
  })
  const [group] = await selectTargetGroups(project, input)

  assert.ok(group)

  const scopes = await resolveTargetTypecheckScopes(project, group)

  assert.equal(scopes.length, 1)
  assert.equal(scopes[0]?.kind, 'project')
  assert.equal(scopes[0]?.cwd, join(cwd, 'packages/app'))
})

test('one source file remains a TypeScript files-mode input', async (t) => {
  const { cwd, project } = await createProject(true)

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  const input = createCommandInput({
    cwd: project.cwd,
    source: 'explicit',
    targets: ['packages/app/source.ts'],
  })
  const [group] = await selectTargetGroups(project, input)

  assert.ok(group)

  const scopes = await resolveTargetTypecheckScopes(project, group)

  assert.equal(scopes.length, 1)
  const [scope] = scopes

  assert.ok(scope)
  assert.equal(scope.kind, 'files')
  assert.deepEqual(scope.files, [join(cwd, 'packages/app/source.ts')])
})
