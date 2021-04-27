import type { AggregatedResult } from '@jest/test-result'

import { AnnotationLevel }       from './checks.interfaces'
import { Annotation }            from './checks.interfaces'

export const formatJestTestResults = (results: AggregatedResult, cwd?: string): Annotation[] => {
  const annotations: Annotation[] = results.testResults
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
        }))
    )
    .flat()

  return annotations
}
