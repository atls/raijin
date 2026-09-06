import assert                   from 'node:assert/strict'
import { mkdir }                from 'node:fs/promises'
import { mkdtemp }              from 'node:fs/promises'
import { rm }                   from 'node:fs/promises'
import { writeFile }            from 'node:fs/promises'
import { tmpdir }               from 'node:os'
import { join }                 from 'node:path'
import { test }                 from 'node:test'

import { createCommandInput }   from '@atls/raijin/commands'
import { toPortableCwd }        from '@atls/raijin/commands'

import { discoverProjectTests } from '../index.js'

const createProject = async () => {
  const rootCwd = await mkdtemp(join(tmpdir(), 'raijin-test-discovery-'))
  const cwd = join(rootCwd, 'packages', 'tools')

  await mkdir(join(cwd, 'src', 'integration'), { recursive: true })
  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'src', 'unit.test.ts'), '')
  await writeFile(join(cwd, 'src', 'integration', 'api.test.ts'), '')

  return { cwd, rootCwd }
}

const createInput = (cwd: string, targets: Array<string> = []) =>
  createCommandInput({
    cwd: toPortableCwd(cwd),
    source: targets.length > 0 ? 'explicit' : 'generated',
    targets,
  })

test('discovers files allowed by each scenario', async (context) => {
  const { cwd, rootCwd } = await createProject()

  context.after(async () => rm(rootCwd, { force: true, recursive: true }))

  const sibling = join(rootCwd, 'packages', 'sibling')

  await mkdir(join(sibling, 'src', 'integration'), { recursive: true })
  await writeFile(join(sibling, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(sibling, 'src', 'unit.test.ts'), '')
  await writeFile(join(sibling, 'src', 'integration', 'api.test.ts'), '')

  assert.deepEqual(
    (
      await discoverProjectTests({ cwd, input: createInput(cwd), rootCwd, scenario: 'general' })
    ).sort(),
    [join(cwd, 'src', 'integration', 'api.test.ts'), join(cwd, 'src', 'unit.test.ts')]
  )
  assert.deepEqual(
    await discoverProjectTests({ cwd, input: createInput(cwd), rootCwd, scenario: 'unit' }),
    [join(cwd, 'src', 'unit.test.ts')]
  )
  assert.deepEqual(
    await discoverProjectTests({ cwd, input: createInput(cwd), rootCwd, scenario: 'integration' }),
    [join(cwd, 'src', 'integration', 'api.test.ts')]
  )
})

test('preserves root-relative targets', async (context) => {
  const { cwd, rootCwd } = await createProject()

  context.after(async () => rm(rootCwd, { force: true, recursive: true }))

  assert.deepEqual(
    await discoverProjectTests({
      cwd,
      input: createInput(cwd, ['packages/tools/src/unit.test.ts']),
      rootCwd,
      scenario: 'unit',
    }),
    [join(cwd, 'src', 'unit.test.ts')]
  )
})

test('applies project test ignore patterns', async (context) => {
  const { cwd, rootCwd } = await createProject()

  context.after(async () => rm(rootCwd, { force: true, recursive: true }))
  await writeFile(
    join(cwd, 'package.json'),
    '{"type":"module","testIgnorePatterns":["src/unit.test.ts"]}\n'
  )

  assert.deepEqual(
    await discoverProjectTests({ cwd, input: createInput(cwd), rootCwd, scenario: 'unit' }),
    []
  )
})

test('preserves the explicit missing target failure', async (context) => {
  const { cwd, rootCwd } = await createProject()

  context.after(async () => rm(rootCwd, { force: true, recursive: true }))

  await assert.rejects(
    discoverProjectTests({
      cwd,
      input: createInput(cwd, ['src/missing.test.ts']),
      rootCwd,
      scenario: 'unit',
    }),
    new Error('Test target does not exist: src/missing.test.ts')
  )
})

test('preserves manifest read failures before target discovery', async (context) => {
  const { cwd, rootCwd } = await createProject()

  context.after(async () => rm(rootCwd, { force: true, recursive: true }))
  await rm(join(cwd, 'package.json'))

  await assert.rejects(
    discoverProjectTests({
      cwd,
      input: createInput(cwd, ['src/missing.test.ts']),
      rootCwd,
      scenario: 'unit',
    }),
    { code: 'ENOENT', path: join(cwd, 'package.json') }
  )
})

test('preserves manifest parse failures before target discovery', async (context) => {
  const { cwd, rootCwd } = await createProject()

  context.after(async () => rm(rootCwd, { force: true, recursive: true }))
  await writeFile(join(cwd, 'package.json'), '{')

  await assert.rejects(
    discoverProjectTests({
      cwd,
      input: createInput(cwd, ['src/missing.test.ts']),
      rootCwd,
      scenario: 'unit',
    }),
    SyntaxError
  )
})
