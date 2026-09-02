import type { TestProjectResult } from '../interfaces/result.js'

import assert                     from 'node:assert/strict'
import { spawn }                  from 'node:child_process'
import { mkdir }                  from 'node:fs/promises'
import { mkdtemp }                from 'node:fs/promises'
import { readFile }               from 'node:fs/promises'
import { rm }                     from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { tmpdir }                 from 'node:os'
import { join }                   from 'node:path'
import { test }                   from 'node:test'
import { fileURLToPath }          from 'node:url'

const RESULT_MARKER = '__RAIJIN_TEST_RESULT__'
const fixture = fileURLToPath(new URL('./project.fixture.ts', import.meta.url))

const createProject = async (source?: string) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-test-project-'))

  await mkdir(join(cwd, 'src'), { recursive: true })
  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  if (source !== undefined) {
    await writeFile(join(cwd, 'src', 'example.test.js'), source)
  }

  return cwd
}

const runProject = async ({
  cwd,
  observeCycle = false,
  provideOutput = true,
  reporter = 'silent',
  targets = [],
  watch = false,
}: {
  cwd: string
  observeCycle?: boolean
  provideOutput?: boolean
  reporter?: 'silent' | 'spec' | 'tap' | null
  targets?: Array<string>
  watch?: boolean
}): Promise<{ output: string; result: TestProjectResult; stderr: string }> =>
  new Promise((resolve, reject) => {
    const env = { ...process.env }

    delete env.NODE_TEST_CONTEXT

    const child = spawn(process.execPath, [...process.execArgv, fixture], {
      env: {
        ...env,
        RAIJIN_TEST_FIXTURE_CWD: cwd,
        RAIJIN_TEST_FIXTURE_CYCLE: String(observeCycle),
        RAIJIN_TEST_FIXTURE_OUTPUT: String(provideOutput),
        RAIJIN_TEST_FIXTURE_REPORTER: reporter ?? 'default',
        RAIJIN_TEST_FIXTURE_TARGETS: JSON.stringify(targets),
        RAIJIN_TEST_FIXTURE_WATCH: String(watch),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 15_000,
    })
    let stdout = ''
    let stderr = ''

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
    })
    child.once('error', reject)
    child.once('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Project test fixture exited with ${code}: ${stderr}`))

        return
      }

      const markerIndex = stdout.lastIndexOf(RESULT_MARKER)

      if (markerIndex < 0) {
        reject(new Error(`Project test fixture did not return a result: ${stdout}${stderr}`))

        return
      }

      resolve({
        output: stdout.slice(0, markerIndex),
        result: JSON.parse(stdout.slice(markerIndex + RESULT_MARKER.length)) as TestProjectResult,
        stderr,
      })
    })
  })

test('returns the native passing summary', async (context) => {
  const cwd = await createProject(
    "import test from 'node:test'; import assert from 'node:assert/strict'; test('passes', () => assert.equal(1, 1));\n"
  )

  context.after(async () => rm(cwd, { force: true, recursive: true }))

  const { result, stderr } = await runProject({ cwd })

  assert.equal(
    result.status,
    'completed',
    result.status === 'provider-failed' ? `${result.failure.message}\n${stderr}` : undefined
  )
  assert.deepEqual(result.terminal, { exitCode: 0, reason: 'passed' })
  assert.equal(result.failures.length, 0)
  assert.equal(result.summary.success, true)
})

test('returns the native successful summary for an empty selection', async (context) => {
  const cwd = await createProject()

  context.after(async () => rm(cwd, { force: true, recursive: true }))

  const { result } = await runProject({ cwd })

  assert.equal(result.status, 'completed')
  assert.equal(result.summary.success, true)
  assert.equal(result.summary.counts.tests, 0)
  assert.deepEqual(result.failures, [])
  assert.deepEqual(result.stderr, [])
  assert.deepEqual(result.terminal, { exitCode: 0, reason: 'passed' })
})

test('returns native failures and stderr for consumers', async (context) => {
  const cwd = await createProject(
    "import test from 'node:test'; import assert from 'node:assert/strict'; test('fails', () => { console.error('failure detail'); assert.equal(1, 2) });\n"
  )

  context.after(async () => rm(cwd, { force: true, recursive: true }))

  const { result, stderr } = await runProject({ cwd })

  assert.equal(
    result.status,
    'completed',
    result.status === 'provider-failed' ? `${result.failure.message}\n${stderr}` : undefined
  )
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'failed' })
  assert.equal(result.failures.length, 1)
  assert.equal(result.summary.success, false)
  assert.match(result.stderr.map(({ message }) => message).join(''), /failure detail/)
})

for (const reporter of ['spec', 'tap'] as const) {
  test(`uses the built-in ${reporter} reporter stream`, async (context) => {
    const cwd = await createProject("import test from 'node:test'; test('reported', () => {});\n")

    context.after(async () => rm(cwd, { force: true, recursive: true }))

    const { output, result, stderr } = await runProject({ cwd, reporter })

    assert.equal(
      result.terminal.exitCode,
      0,
      result.status === 'provider-failed' ? `${result.failure.message}\n${stderr}` : undefined
    )
    if (reporter === 'tap') {
      assert.match(output, /TAP version 13/)
    }
    assert.match(output, /reported/)
  })
}

for (const reporter of [null, 'spec', 'tap'] as const) {
  test(`rejects ${reporter ?? 'default'} reporter without output before loading tests`, async (context) => {
    const cwd = await createProject(
      "import { writeFileSync } from 'node:fs'; writeFileSync('executed', 'unexpected');\n"
    )

    context.after(async () => rm(cwd, { force: true, recursive: true }))

    const { result } = await runProject({ cwd, reporter, provideOutput: false })

    assert.equal(result.status, 'provider-failed')
    assert.equal(result.failure.name, 'Error')
    assert.equal(result.failure.message, 'Node test reporter output is unavailable')
    assert.deepEqual(result.terminal, { exitCode: 1, reason: 'provider-failed' })
    await assert.rejects(readFile(join(cwd, 'executed')), { code: 'ENOENT' })
  })
}

test('ends watch mode through the native abort signal', async (context) => {
  const cwd = await createProject(
    "import test from 'node:test'; import { writeFile } from 'node:fs/promises'; import { setTimeout } from 'node:timers/promises'; test('watched', async () => { await writeFile('watch-ready', 'ready'); await setTimeout(10_000) });\n"
  )

  context.after(async () => rm(cwd, { force: true, recursive: true }))

  const { output, result } = await runProject({ cwd, watch: true })

  assert.match(output, /__RAIJIN_TEST_ABORT__/)
  assert.equal(await readFile(join(cwd, 'watch-ready'), 'utf8'), 'ready')
  assert.equal(result.status, 'completed')
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'failed' })
})

test('keeps a completed watch run active until abort', async (context) => {
  const cwd = await createProject("import test from 'node:test'; test('watched', () => {});\n")

  context.after(async () => rm(cwd, { force: true, recursive: true }))

  const { output, result } = await runProject({
    cwd,
    observeCycle: true,
    reporter: 'tap',
    watch: true,
  })

  assert.match(output, /__RAIJIN_TEST_ABORT__/)
  const completedCycle = output.slice(0, output.indexOf('__RAIJIN_TEST_ABORT__'))

  assert.match(completedCycle, /^# tests 1$/m)
  assert.match(completedCycle, /^# pass 1$/m)
  assert.match(completedCycle, /^# fail 0$/m)
  assert.match(completedCycle, /^# cancelled 0$/m)
  assert.match(completedCycle, /^# duration_ms .+$/m)
  assert.equal(result.status, 'completed')
  assert.equal(result.summary.success, true)
  assert.deepEqual(result.failures, [])
  assert.deepEqual(result.terminal, { exitCode: 0, reason: 'passed' })
})

test('rejects a completed cycle without watch before the controlled abort', async (context) => {
  const cwd = await createProject("import test from 'node:test'; test('not watched', () => {});\n")

  context.after(async () => rm(cwd, { force: true, recursive: true }))

  await assert.rejects(
    runProject({ cwd, observeCycle: true, reporter: 'tap' }),
    /Watch completed before the controlled abort/
  )
})

test('maps discovery and runtime configuration failures into one result', async (context) => {
  const cwd = await createProject("import test from 'node:test'; test('unused', () => {});\n")

  context.after(async () => rm(cwd, { force: true, recursive: true }))

  await writeFile(
    join(cwd, 'package.json'),
    '{"type":"module","dependencies":{"@atls/raijin":"0.0.0"}}\n'
  )

  const { result: runtimeFailure } = await runProject({ cwd })

  assert.equal(runtimeFailure.status, 'provider-failed')
  assert.match(runtimeFailure.failure.message, /@atls\/raijin\/runtime-exec-argv/)
  assert.deepEqual(runtimeFailure.terminal, { exitCode: 1, reason: 'provider-failed' })

  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')

  const { result: discoveryFailure } = await runProject({
    cwd,
    targets: ['src/missing.test.js'],
  })

  assert.equal(discoveryFailure.status, 'provider-failed')
  assert.equal(discoveryFailure.failure.message, 'Test target does not exist: src/missing.test.js')
  assert.deepEqual(discoveryFailure.terminal, { exitCode: 1, reason: 'provider-failed' })
})
