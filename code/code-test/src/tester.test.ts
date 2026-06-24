import assert        from 'node:assert/strict'
import { mkdir }     from 'node:fs/promises'
import { mkdtemp }   from 'node:fs/promises'
import { writeFile } from 'node:fs/promises'
import { tmpdir }    from 'node:os'
import { join }      from 'node:path'
import { test }      from 'node:test'

import { Tester }    from './tester.js'

type TestFileCollector = {
  collectTestFiles: (
    cwd: string,
    type: 'integration' | 'unit' | undefined,
    patterns: Array<string> | undefined
  ) => Promise<Array<string>>
}

const createProject = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-test-'))

  await writeFile(join(cwd, 'package.json'), `${JSON.stringify({ type: 'module' })}\n`)

  return cwd
}

test('should expand explicit directory targets before collecting unit tests', async () => {
  const cwd = await createProject()
  const unit = join(cwd, 'src/unit')
  const tester = await Tester.initialize(cwd)

  await mkdir(unit, { recursive: true })
  await writeFile(
    join(unit, 'sample.test.js'),
    [
      "import assert from 'node:assert/strict'",
      "import { test } from 'node:test'",
      '',
      "test('sample', () => {",
      '  assert.equal(1, 1)',
      '})',
      '',
    ].join('\n')
  )

  const files = await (tester as unknown as TestFileCollector).collectTestFiles(cwd, 'unit', [
    'src',
  ])

  assert.deepEqual(files, [join(unit, 'sample.test.js')])
})

test('should collect unit tests directly under explicit directory targets', async () => {
  const cwd = await createProject()
  const src = join(cwd, 'src')
  const tester = await Tester.initialize(cwd)

  await mkdir(src, { recursive: true })
  await writeFile(
    join(src, 'formatter.test.js'),
    [
      "import assert from 'node:assert/strict'",
      "import { test } from 'node:test'",
      '',
      "test('sample', () => {",
      '  assert.equal(1, 1)',
      '})',
      '',
    ].join('\n')
  )

  const files = await (tester as unknown as TestFileCollector).collectTestFiles(cwd, 'unit', [
    'src',
  ])

  assert.deepEqual(files, [join(src, 'formatter.test.js')])
})

test('should collect tests directly under explicit integration directory targets', async () => {
  const cwd = await createProject()
  const integration = join(cwd, 'integration')
  const tester = await Tester.initialize(cwd)

  await mkdir(integration, { recursive: true })
  await writeFile(
    join(integration, 'sample.test.js'),
    [
      "import assert from 'node:assert/strict'",
      "import { test } from 'node:test'",
      '',
      "test('sample', () => {",
      '  assert.equal(1, 1)',
      '})',
      '',
    ].join('\n')
  )

  const files = await (tester as unknown as TestFileCollector).collectTestFiles(
    cwd,
    'integration',
    ['integration']
  )

  assert.deepEqual(files, [join(integration, 'sample.test.js')])
})

test('should expand explicit directory targets with glob metacharacters as literal paths', async () => {
  const cwd = await createProject()
  const unit = join(cwd, 'src/[id]/unit')
  const tester = await Tester.initialize(cwd)

  await mkdir(unit, { recursive: true })
  await writeFile(
    join(unit, 'sample.test.js'),
    [
      "import assert from 'node:assert/strict'",
      "import { test } from 'node:test'",
      '',
      "test('sample', () => {",
      '  assert.equal(1, 1)',
      '})',
      '',
    ].join('\n')
  )

  const files = await (tester as unknown as TestFileCollector).collectTestFiles(cwd, 'unit', [
    'src/[id]',
  ])

  assert.deepEqual(files, [join(unit, 'sample.test.js')])
})

test('should fail clearly when explicit test target does not exist', async () => {
  const cwd = await createProject()
  const tester = await Tester.initialize(cwd)

  await assert.rejects(
    async () =>
      tester.unit(cwd, {
        files: ['src/missing'],
        testReporter: 'tap',
      }),
    new Error('Test target does not exist: src/missing')
  )
})
