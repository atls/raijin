import type { Annotation } from './github.checks.js'

import { relative }        from 'node:path'

import { BaseCommand }     from '@yarnpkg/cli'

import { AnnotationLevel } from './github.checks.js'

export abstract class AbstractChecksTestCommand extends BaseCommand {
  formatResults(results: Array<TestFail>, cwd: string): Array<Annotation> {
    return results.map((result) => ({
      path: result.file ? relative(cwd, result.file) : cwd,
      start_line: result.column ?? 1,
      end_line: result.column ?? 1,
      annotation_level: AnnotationLevel.Failure,
      raw_details: result.details.error.stack || result.details.error.message,
      title: result.details.error.message,
      message: result.details.error.message,
    }))
  }
}
