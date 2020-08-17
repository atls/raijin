import execa                           from 'execa'
import { Command }                     from '@oclif/command'
import { tmpdir }                      from 'os'
import { join }                        from 'path'

import { JEST_CONFIG_PATH }            from '@monstrs/config'

import { AnnotationLevel, Conclusion } from '../../types'
import { createCheck }                 from '../../github'
import { isReportExists }              from '../../utils'

export default class TestCommand extends Command {
  static description: string = 'Check test via jest'

  static examples: string[] = ['$ mctl check:test']

  async run(): Promise<void> {
    const reportPath = join(tmpdir(), `jest-report-${new Date().getTime()}.json`)

    try {
      await execa('jest', [
        '--config',
        JEST_CONFIG_PATH,
        '--json',
        '--outputFile',
        reportPath,
        '--testLocationInResults',
      ])
    } catch (error) {
      if (!(await isReportExists(reportPath))) {
        this.log(error.stderr)
      }
    }

    // eslint-disable-next-line
    await this.check(require(reportPath))
  }

  async check({ testResults }: any): Promise<void> {
    const cwd = process.env.GITHUB_WORKSPACE || process.cwd()

    const assertions = testResults
      .reduce(
        (result, testResult) => [
          ...result,
          ...testResult.assertionResults.map(assertion => ({
            ...assertion,
            path: testResult.name.substring(cwd.length + 1),
          })),
        ],
        []
      )
      .filter(assertion => assertion.status === 'failed')

    const annotations = assertions.map(assertion => ({
      path: assertion.path,
      start_line: assertion.location.line + 1,
      end_line: assertion.location.line + 1,
      annotation_level: AnnotationLevel.Failure,
      raw_details: assertion.failureMessages.join('\n'),
      title: assertion.ancestorTitles.join(' '),
      message: assertion.title,
    }))

    await createCheck('Test', annotations.length > 0 ? Conclusion.Failure : Conclusion.Success, {
      title: annotations.length > 0 ? `Errors ${annotations.length}` : 'Successful',
      summary: annotations.length > 0 ? `Found ${annotations.length} errors` : 'All checks passed',
      annotations,
    })
  }
}
