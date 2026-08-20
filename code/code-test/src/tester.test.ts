import type { CommandInput }  from '@atls/raijin/commands'
import type { EventData }     from 'node:test'
import type { TestEvent }     from 'node:test/reporters'

import assert                 from 'node:assert/strict'
import EventEmitter           from 'node:events'
import { once }               from 'node:events'
import { mkdir }              from 'node:fs/promises'
import { mkdtemp }            from 'node:fs/promises'
import { writeFile }          from 'node:fs/promises'
import { tmpdir }             from 'node:os'
import { join }               from 'node:path'
import { resolve }            from 'node:path'
import { sep }                from 'node:path'
import { test }               from 'node:test'

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

type TestEventCollector = {
  collectTestsStream: (
    testsStream: EventEmitter,
    reporter?: NodeJS.ReadableStream,
    watch?: boolean,
    emitEvents?: boolean
  ) => Promise<Array<TestEvent>>
}

const createInput = (cwd: string, targets: Array<string> = []): CommandInput =>
  createCommandInput({ cwd: toPortableCwd(cwd), source: 'explicit', targets })

const createProject = async (): Promise<string> => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-test-'))

  await writeFile(join(cwd, 'package.json'), `${JSON.stringify({ type: 'module' })}\n`)

  return cwd
}

test('should resolve relative event files once for emitted and returned events', async () => {
  const projectCwd = await createProject()
  const executionCwd = join(projectCwd, 'packages', 'tools')

  await mkdir(executionCwd, { recursive: true })
  await writeFile(join(executionCwd, 'package.json'), `${JSON.stringify({ type: 'module' })}\n`)

  const tester = await Tester.initialize(executionCwd, { projectCwd })
  const testsStream = new EventEmitter()
  const relativeFile = join('packages', 'tools', 'src', 'sample.test.ts')
  const emittedEvent = once(tester, 'test:fail')
  const resultsPromise = (tester as unknown as TestEventCollector).collectTestsStream(
    testsStream,
    undefined,
    false,
    true
  )

  testsStream.emit('test:fail', { file: relativeFile } as EventData.TestFail)
  testsStream.emit('end')

  const [emittedArguments, results] = await Promise.all([emittedEvent, resultsPromise])
  const result = results.find((event) => event.type === 'test:fail')

  assert.ok(result)
  assert.equal(result.data.file, resolve(projectCwd, relativeFile))
  assert.strictEqual(emittedArguments[0], result.data)
})

test('should preserve absolute event files for emitted and returned events', async () => {
  const projectCwd = await createProject()
  const executionCwd = join(projectCwd, 'packages', 'tools')

  await mkdir(executionCwd, { recursive: true })
  await writeFile(join(executionCwd, 'package.json'), `${JSON.stringify({ type: 'module' })}\n`)

  const tester = await Tester.initialize(executionCwd, { projectCwd })
  const testsStream = new EventEmitter()
  const absoluteFile = `${projectCwd}${sep}packages${sep}tools${sep}src${sep}..${sep}sample.test.ts`
  const emittedEvent = once(tester, 'test:fail')
  const resultsPromise = (tester as unknown as TestEventCollector).collectTestsStream(
    testsStream,
    undefined,
    false,
    true
  )

  testsStream.emit('test:fail', { file: absoluteFile } as EventData.TestFail)
  testsStream.emit('end')

  const [emittedArguments, results] = await Promise.all([emittedEvent, resultsPromise])
  const result = results.find((event) => event.type === 'test:fail')

  assert.ok(result)
  assert.equal(result.data.file, absoluteFile)
  assert.strictEqual(emittedArguments[0], result.data)
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

test('should keep workspace ignore patterns with root-relative explicit test files', async () => {
  const cwd = await createProject()
  const workspace = join(cwd, 'packages/tools')
  const ignoredFile = join(workspace, 'sources/ignored.test.js')
  const keptFile = join(workspace, 'sources/kept.test.js')

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

  const previousExecArgv = process.env[TEST_EXEC_ARGV_ENV]

  process.env[TEST_EXEC_ARGV_ENV] = JSON.stringify(['--enable-source-maps'])

  let results: Awaited<ReturnType<typeof tester.unit>>

  try {
    results = await tester.unit(
      createInput(workspace, [
        'packages/tools/sources/ignored.test.js',
        'packages/tools/sources/kept.test.js',
      ]),
      {
        testReporter: 'tap',
      }
    )
  } finally {
    if (previousExecArgv === undefined) {
      Reflect.deleteProperty(process.env, TEST_EXEC_ARGV_ENV)
    } else {
      process.env[TEST_EXEC_ARGV_ENV] = previousExecArgv
    }
  }

  assert.equal(
    results.some((result) => result.type === 'test:fail'),
    false
  )
  assert.deepEqual(
    await (tester as unknown as TestFileCollector).collectTestFiles(
      createInput(workspace, [
        'packages/tools/sources/ignored.test.js',
        'packages/tools/sources/kept.test.js',
      ]),
      'unit'
    ),
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
