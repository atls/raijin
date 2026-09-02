import type { EventData }          from 'node:test'

import type { TestProjectInput }   from '../interfaces/input.js'
import type { TestProjectResult }  from '../interfaces/result.js'

import { run }                     from 'node:test'

import { SummaryMissingException } from './exceptions/summary.js'
import { discoverProjectTests }    from '../discovery/index.js'
import { configuration }           from './configuration.js'
import { resolveRuntimeExecArgv }  from './exec-argv.js'
import { mapFailure }              from './mappers/failure.js'
import { normalizeFailureFile }    from './mappers/files.js'
import { normalizeStderrFile }     from './mappers/files.js'
import { consumeTestReport }       from './report.js'
import { requireOutput }           from './report.js'

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

    if (reporter !== 'silent') {
      requireOutput(stdout)
    }

    const failures: Array<EventData.TestFail> = []
    const stderr: Array<EventData.TestStderr> = []
    let summary: EventData.TestSummary | undefined
    const config = configuration[scenario]
    const stream = run({
      concurrency: config.concurrency,
      cwd,
      execArgv,
      files,
      setup: (tests) => {
        tests.on('test:fail', (failure) => {
          failures.push(normalizeFailureFile(failure, rootCwd))
        })
        tests.on('test:stderr', (event) => {
          stderr.push(normalizeStderrFile(event, rootCwd))
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
      failure: mapFailure(error),
      terminal: { exitCode: 1, reason: 'provider-failed' },
    }
  }
}
