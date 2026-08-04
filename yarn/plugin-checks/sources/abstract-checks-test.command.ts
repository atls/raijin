import type { EventData }    from 'node:test'
import type { TestEvent }    from 'node:test/reporters'

import type { Annotation }   from './github.checks.js'

import { RaijinCommand }     from '@atls/raijin/commands'

import { formatTestResults } from './test-results.formatter.js'

type TestFail = EventData.TestFail

export abstract class AbstractChecksTestCommand extends RaijinCommand {
  formatResults(
    results: Array<TestFail>,
    cwd: string,
    events: Array<TestEvent> = []
  ): Array<Annotation> {
    return formatTestResults(results, cwd, events)
  }
}
