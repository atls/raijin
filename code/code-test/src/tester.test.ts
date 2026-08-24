import type { CommandInput }  from '@atls/raijin/commands'

import assert                 from 'node:assert/strict'
import { execFile }           from 'node:child_process'
import { mkdir }              from 'node:fs/promises'
import { mkdtemp }            from 'node:fs/promises'
import { rm }                 from 'node:fs/promises'
import { writeFile }          from 'node:fs/promises'
import { tmpdir }             from 'node:os'
import { join }               from 'node:path'
import { test }               from 'node:test'
import { promisify }          from 'node:util'

import { createCommandInput } from '@atls/raijin/commands'
import { toPortableCwd }      from '@atls/raijin/commands'

import { TEST_EXEC_ARGV_ENV } from './test-exec-argv.js'
import { Tester }             from './tester.js'

type TestFileCollector = {
  collectTestFiles: (
    input: CommandInput,
    type: 'integration' | 'unit' | undefined
  ) => Promise<Array<string>>
}

const REGRESSION_TIMEOUT = 20_000
const executeFile = promisify(execFile)

const createInput = (cwd: string, targets: Array<string> = []): CommandInput =>
  createCommandInput({ cwd: toPortableCwd(cwd), source: 'explicit', targets })

const createProject = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-test-'))

  await writeFile(join(cwd, 'package.json'), `${JSON.stringify({ type: 'module' })}\n`)

  return cwd
}

const runTesterProcess = async (
  cwd: string,
  projectCwd: string,
  input: CommandInput,
  modes: Array<'events' | 'tap'>
): Promise<{ stdout: string; stderr: string }> => {
  const runner = join(projectCwd, 'tester-runner.mjs')
  const testerUrl = new URL('./tester.ts', import.meta.url).href
  const env = { ...process.env }

  Reflect.deleteProperty(env, 'NODE_TEST_CONTEXT')
  Reflect.deleteProperty(env, 'NODE_TEST_WORKER_ID')

  await writeFile(
    runner,
    [
      "import assert from 'node:assert/strict'",
      `import { Tester } from ${JSON.stringify(testerUrl)}`,
      '',
      `const tester = await Tester.initialize(${JSON.stringify(cwd)}, {`,
      `  projectCwd: ${JSON.stringify(projectCwd)},`,
      '})',
      `const input = ${JSON.stringify(input)}`,
      `const modes = ${JSON.stringify(modes)}`,
      '',
      `process.env[${JSON.stringify(TEST_EXEC_ARGV_ENV)}] = JSON.stringify(['--enable-source-maps'])`,
      '',
      'for (const mode of modes) {',
      "  const options = mode === 'tap' ? { testReporter: 'tap' } : undefined",
      '  const results = await tester.unit(input, options)',
      '  const summary = results.find(',
      "    (result) => result.type === 'test:summary' && !result.data.file",
      '  )',
      '',
      '  assert.ok(summary)',
      '  assert.equal(summary.data.success, true)',
      "  assert.equal(results.some((result) => result.type === 'test:fail'), false)",
      "  console.log('tester:' + mode + ':complete')",
      '}',
      '',
    ].join('\n')
  )

  return executeFile(process.execPath, [...process.execArgv, runner], {
    cwd: process.cwd(),
    env,
    encoding: 'utf8',
    timeout: REGRESSION_TIMEOUT,
  })
}

test('should drain event and TAP reporter streams before the process exits', async (t) => {
  const cwd = await createProject()
  const testFile = join(cwd, 'sample.test.js')

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await writeFile(
    testFile,
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

  const { stdout, stderr } = await runTesterProcess(
    cwd,
    cwd,
    createInput(cwd, ['sample.test.js']),
    ['events', 'tap']
  )

  assert.match(stdout, /tester:events:complete/)
  assert.match(stdout, /tester:tap:complete/)
  assert.match(stdout, /# tests 1/)
  assert.match(stdout, /# pass 1/)
  assert.match(stdout, /# fail 0/)
  assert.doesNotMatch(stderr, /run\(\) is being called recursively/)
})

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

  const files = await (tester as unknown as TestFileCollector).collectTestFiles(
    createInput(cwd, ['src']),
    'unit'
  )

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

  const files = await (tester as unknown as TestFileCollector).collectTestFiles(
    createInput(cwd, ['src']),
    'unit'
  )

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
    createInput(cwd, ['integration']),
    'integration'
  )

  assert.deepEqual(files, [join(integration, 'sample.test.js')])
})

test('should resolve root-relative explicit test files when collecting from workspace target', async () => {
  const cwd = await createProject()
  const workspace = join(cwd, 'packages/tools')
  const testFile = join(workspace, 'sources/sample.test.js')
  const tester = await Tester.initialize(cwd)

  await mkdir(join(workspace, 'sources'), { recursive: true })
  await writeFile(
    testFile,
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
    createInput(workspace, ['packages/tools/sources/sample.test.js']),
    'unit'
  )

  assert.deepEqual(files, [testFile])
})

test('should resolve root-relative glob test files when collecting from workspace target', async () => {
  const cwd = await createProject()
  const workspace = join(cwd, 'packages/tools')
  const testFile = join(workspace, 'sources/sample.test.js')

  await mkdir(join(workspace, 'sources'), { recursive: true })
  await writeFile(join(workspace, 'package.json'), `${JSON.stringify({ type: 'module' })}\n`)
  const tester = await Tester.initialize(workspace, { projectCwd: cwd })
  await writeFile(
    testFile,
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
    createInput(workspace, ['packages/tools/**/*.test.js']),
    'unit'
  )

  assert.deepEqual(files, [testFile])
})

test('should keep workspace ignore patterns with root-relative explicit test files', async (t) => {
  const cwd = await createProject()
  const workspace = join(cwd, 'packages/tools')
  const ignoredFile = join(workspace, 'sources/ignored.test.js')
  const keptFile = join(workspace, 'sources/kept.test.js')

  t.after(async () => rm(cwd, { recursive: true, force: true }))

  await mkdir(join(workspace, 'sources'), { recursive: true })
  await writeFile(
    join(workspace, 'package.json'),
    `${JSON.stringify({ type: 'module', testIgnorePatterns: ['sources/ignored.test.js'] })}\n`
  )
  const tester = await Tester.initialize(workspace, { projectCwd: cwd })
  await writeFile(
    ignoredFile,
    [
      "import assert from 'node:assert/strict'",
      "import { test } from 'node:test'",
      '',
      "test('ignored', () => {",
      '  assert.equal(1, 2)',
      '})',
      '',
    ].join('\n')
  )
  await writeFile(
    keptFile,
    [
      "import assert from 'node:assert/strict'",
      "import { test } from 'node:test'",
      '',
      "test('kept', () => {",
      '  assert.equal(1, 1)',
      '})',
      '',
    ].join('\n')
  )

  const input = createInput(workspace, [
    'packages/tools/sources/ignored.test.js',
    'packages/tools/sources/kept.test.js',
  ])
  const { stdout, stderr } = await runTesterProcess(workspace, cwd, input, ['events', 'tap'])

  assert.match(stdout, /tester:events:complete/)
  assert.match(stdout, /tester:tap:complete/)
  assert.match(stdout, /# tests 1/)
  assert.match(stdout, /# pass 1/)
  assert.match(stdout, /# fail 0/)
  assert.doesNotMatch(stderr, /run\(\) is being called recursively/)
  assert.deepEqual(
    await (tester as unknown as TestFileCollector).collectTestFiles(input, 'unit'),
    [ignoredFile, keptFile]
  )
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

  const files = await (tester as unknown as TestFileCollector).collectTestFiles(
    createInput(cwd, ['src/[id]']),
    'unit'
  )

  assert.deepEqual(files, [join(unit, 'sample.test.js')])
})

test('should fail clearly when explicit test target does not exist', async () => {
  const cwd = await createProject()
  const tester = await Tester.initialize(cwd)

  await assert.rejects(
    async () =>
      tester.unit(createInput(cwd, ['src/missing']), {
        testReporter: 'tap',
      }),
    new Error('Test target does not exist: src/missing')
  )
})
