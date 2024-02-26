import type { AggregatedResult } from '@jest/test-result'

import { BaseCommand }           from '@yarnpkg/cli'

import { AnnotationLevel }       from './github.checks.js'
import { Annotation }            from './github.checks.js'

abstract class AbstractChecksTestCommand extends BaseCommand {
  formatResults(results: AggregatedResult, cwd?: string): Annotation[] {
    return results.testResults
      .map(({ testResults, testFilePath }) =>
        testResults
          .filter((testResult) => testResult.status === 'failed')
          .map((testResult) => ({
            path: cwd ? testFilePath.substring(cwd.length + 1) : testFilePath,
            start_line: testResult.location ? testResult.location.line + 1 : 1,
            end_line: testResult.location ? testResult.location.line + 1 : 1,
            annotation_level: AnnotationLevel.Failure,
            raw_details: testResult.failureMessages.join('\n'),
            title: testResult.ancestorTitles.join(' '),
            message: testResult.title,
          })))
      .flat()
  }
}

export { AbstractChecksTestCommand }
