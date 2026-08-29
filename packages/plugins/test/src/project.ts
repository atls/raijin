import type { EventData }         from 'node:test'

import type { TestProjectInput }  from './interfaces/input.js'
import type { TestReporter }      from './interfaces/input.js'
import type { TestProjectResult } from './interfaces/result.js'

import { isAbsolute }             from 'node:path'
import { resolve }                from 'node:path'
import { finished }               from 'node:stream/promises'
import { pipeline }               from 'node:stream/promises'
import { run }                    from 'node:test'
import { spec }                   from 'node:test/reporters'
import { tap }                    from 'node:test/reporters'

import { discoverProjectTests }   from './discovery/index.js'
import { resolveRuntimeExecArgv } from './runtime-exec-argv.js'
import { scenarioPolicies }       from './scenario-policy.js'

const toFailure = (error: unknown): { name: string; message: string } => ({
  name: error instanceof Error ? error.name : 'Error',
  message: error instanceof Error ? error.message : String(error),
})

const resolveEventFile = (file: string | undefined, rootCwd: string): string | undefined =>
  file && !isAbsolute(file) ? resolve(rootCwd, file) : file

const normalizeFailure = (failure: EventData.TestFail, rootCwd: string): EventData.TestFail => ({
  ...failure,
  file: resolveEventFile(failure.file, rootCwd),
})

const normalizeStderr = (stderr: EventData.TestStderr, rootCwd: string): EventData.TestStderr => ({
  ...stderr,
  file: resolveEventFile(stderr.file, rootCwd) ?? stderr.file,
})

const consumeReport = async (
  stream: ReturnType<typeof run>,
  reporter: TestReporter,
  stdout: TestProjectInput['stdout']
): Promise<void> => {
  if (reporter === 'silent') {
    stream.resume()
    await finished(stream)

    return
  }

  if (!stdout) {
    throw new Error('Node test reporter output is unavailable')
  }

  const output = stream.compose(reporter === 'tap' ? tap : spec)

  await pipeline(output, stdout, { end: false })
}

export const testProject = async ({
  rootCwd,
  cwd,
  input,
  reporter = 'spec',
  signal,
  stdout,
  scenario,
  watch = false,
}: TestProjectInput): Promise<TestProjectResult> => {
  try {
    const files = await discoverProjectTests({ cwd, input, rootCwd, scenario })
    const execArgv = await resolveRuntimeExecArgv(cwd)
    const failures: Array<EventData.TestFail> = []
    const stderr: Array<EventData.TestStderr> = []
    let summary: EventData.TestSummary | undefined
    const policy = scenarioPolicies[scenario]
    const stream = run({
      concurrency: policy.concurrency,
      cwd,
      execArgv,
      files,
      setup: (tests) => {
        tests.on('test:fail', (failure) => {
          failures.push(normalizeFailure(failure, rootCwd))
        })
        tests.on('test:stderr', (event) => {
          stderr.push(normalizeStderr(event, rootCwd))
        })
        tests.on('test:summary', (event) => {
          summary = event
        })
      },
      signal,
      timeout: policy.timeout,
      watch,
    })

    await consumeReport(stream, reporter, stdout)

    if (!summary) {
      throw new Error('Node test runner did not report a final summary')
    }

    const completed = {
      status: 'completed',
      failures,
      stderr,
      summary,
    } as const

    return summary.success
      ? { ...completed, terminal: { exitCode: 0, reason: 'passed' } }
      : { ...completed, terminal: { exitCode: 1, reason: 'failed' } }
  } catch (error) {
    return {
      status: 'provider-failed',
      failure: toFailure(error),
      terminal: { exitCode: 1, reason: 'provider-failed' },
    }
  }
}
