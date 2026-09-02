import type { TestProjectResult } from '../interfaces/result.js'

import assert                     from 'node:assert/strict'
import { spawn }                  from 'node:child_process'
import { mkdir }                  from 'node:fs/promises'
import { mkdtemp }                from 'node:fs/promises'
import { rm }                     from 'node:fs/promises'
import { writeFile }              from 'node:fs/promises'
import { tmpdir }                 from 'node:os'
import { join }                   from 'node:path'
import { test }                   from 'node:test'
import { fileURLToPath }          from 'node:url'

const RESULT_MARKER = '__RAIJIN_TEST_RESULT__'
const fixture = fileURLToPath(new URL('./project.fixture.ts', import.meta.url))

const createProject = async (source: string) => {
  const cwd = await mkdtemp(join(tmpdir(), 'raijin-test-project-'))

  await mkdir(join(cwd, 'src'), { recursive: true })
  await writeFile(join(cwd, 'package.json'), '{"type":"module"}\n')
  await writeFile(join(cwd, 'src', 'example.test.js'), source)

  return cwd
}

const runProject = async ({
  cwd,
  reporter = 'silent',
  targets = [],
  watch = false,
}: {
  cwd: string
  reporter?: 'silent' | 'tap'
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
        RAIJIN_TEST_FIXTURE_REPORTER: reporter,
        RAIJIN_TEST_FIXTURE_TARGETS: JSON.stringify(targets),
        RAIJIN_TEST_FIXTURE_WATCH: String(watch),
      },
      stdio: ['ignore', 'pipe', 'pipe'],
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

test('uses the built-in reporter stream', async (context) => {
  const cwd = await createProject("import test from 'node:test'; test('reported', () => {});\n")

  context.after(async () => rm(cwd, { force: true, recursive: true }))

  const { output, result, stderr } = await runProject({ cwd, reporter: 'tap' })

  assert.equal(
    result.terminal.exitCode,
    0,
    result.status === 'provider-failed' ? `${result.failure.message}\n${stderr}` : undefined
  )
  assert.match(output, /TAP version 13/)
  assert.match(output, /reported/)
})

test('ends watch mode through the native abort signal', async (context) => {
  const cwd = await createProject(
    "import test from 'node:test'; import { setTimeout } from 'node:timers/promises'; test('watched', async () => setTimeout(10_000));\n"
  )

  context.after(async () => rm(cwd, { force: true, recursive: true }))

  const { result } = await runProject({ cwd, watch: true })

  assert.equal(result.status, 'completed')
  assert.deepEqual(result.terminal, { exitCode: 1, reason: 'failed' })
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
