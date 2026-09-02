import type { EventData }          from 'node:test'

import type { TestProjectInput }   from '../interfaces/input.js'
import type { TestProjectResult }  from '../interfaces/result.js'

import { run }                     from 'node:test'

import { SummaryMissingException } from './exceptions/summary.js'
import { discoverProjectTests }    from '../discovery/index.js'
import { normalizeFailure }        from './event-files.js'
import { normalizeStderr }         from './event-files.js'
import { resolveRuntimeExecArgv }  from './exec-argv.js'
import { toProviderFailure }       from './provider-failure.js'
import { consumeTestReport }       from './report.js'
import { scenarioConfig }          from './scenarios.js'

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
    const config = scenarioConfig[scenario]
    const stream = run({
      concurrency: config.concurrency,
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
      timeout: config.timeout,
      watch,
    })

    await consumeTestReport(stream, reporter, stdout)

    if (!summary) {
      throw new SummaryMissingException()
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
      failure: toProviderFailure(error),
      terminal: { exitCode: 1, reason: 'provider-failed' },
    }
  }
}
