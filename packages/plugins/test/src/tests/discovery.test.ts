import type { PortablePath }  from '@yarnpkg/fslib'

import assert                 from 'node:assert/strict'
import { mkdir }              from 'node:fs/promises'
import { mkdtemp }            from 'node:fs/promises'
import { rm }                 from 'node:fs/promises'
import { writeFile }          from 'node:fs/promises'
import { tmpdir }             from 'node:os'
import { join }               from 'node:path'
import { test }               from 'node:test'

import { createCommandInput } from '@atls/raijin/commands'

import { TestDiscovery }      from '../discovery.js'

const createProject = async () => {
  const projectCwd = await mkdtemp(join(tmpdir(), 'raijin-test-discovery-'))
  const workspaceCwd = join(projectCwd, 'packages', 'tools')

  await mkdir(join(workspaceCwd, 'sources', 'integration'), { recursive: true })
  await writeFile(join(workspaceCwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(workspaceCwd, 'sources', 'unit.test.ts'), '')
  await writeFile(join(workspaceCwd, 'sources', 'integration', 'api.test.ts'), '')

  return { projectCwd, workspaceCwd }
}

test('general, unit, and integration discover only their permitted files', async (context) => {
  const { projectCwd, workspaceCwd } = await createProject()

  context.after(async () => rm(projectCwd, { force: true, recursive: true }))

  const discovery = new TestDiscovery(workspaceCwd, projectCwd)
  const input = createCommandInput({
    cwd: workspaceCwd as PortablePath,
    source: 'generated',
    targets: [],
  })

  assert.deepEqual((await discovery.collect(input, 'general')).sort(), [
    join(workspaceCwd, 'sources', 'integration', 'api.test.ts'),
    join(workspaceCwd, 'sources', 'unit.test.ts'),
  ])
  assert.deepEqual(await discovery.collect(input, 'unit'), [
    join(workspaceCwd, 'sources', 'unit.test.ts'),
  ])
  assert.deepEqual(await discovery.collect(input, 'integration'), [
    join(workspaceCwd, 'sources', 'integration', 'api.test.ts'),
  ])
})

test('preserves root-relative targets without changing command normalization', async (context) => {
  const { projectCwd, workspaceCwd } = await createProject()

  context.after(async () => rm(projectCwd, { force: true, recursive: true }))

  const discovery = new TestDiscovery(workspaceCwd, projectCwd)
  const input = createCommandInput({
    cwd: workspaceCwd as PortablePath,
    source: 'explicit',
    targets: ['packages/tools/sources/unit.test.ts'],
  })

  assert.deepEqual(await discovery.collect(input, 'unit'), [
    join(workspaceCwd, 'sources', 'unit.test.ts'),
  ])
})

test('applies workspace test ignore patterns after discovery', async (context) => {
  const { projectCwd, workspaceCwd } = await createProject()

  context.after(async () => rm(projectCwd, { force: true, recursive: true }))

  await writeFile(
    join(workspaceCwd, 'package.json'),
    '{"type":"module","testIgnorePatterns":["sources/unit.test.ts"]}\n'
  )

  const discovery = new TestDiscovery(workspaceCwd, projectCwd)
  const input = createCommandInput({
    cwd: workspaceCwd as PortablePath,
    source: 'generated',
    targets: [],
  })

  assert.deepEqual(await discovery.collect(input, 'unit'), [])
})

test('preserves the explicit missing target failure', async (context) => {
  const { projectCwd, workspaceCwd } = await createProject()

  context.after(async () => rm(projectCwd, { force: true, recursive: true }))

  const discovery = new TestDiscovery(workspaceCwd, projectCwd)
  const input = createCommandInput({
    cwd: workspaceCwd as PortablePath,
    source: 'explicit',
    targets: ['sources/missing.test.ts'],
  })

  await assert.rejects(
    discovery.collect(input, 'unit'),
    new Error('Test target does not exist: sources/missing.test.ts')
  )
})
