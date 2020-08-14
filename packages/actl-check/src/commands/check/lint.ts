import execa                                      from 'execa'
import { Command }                                from '@oclif/command'
import { tmpdir }                                 from 'os'
import { join }                                   from 'path'

import { ESLINT_CONFIG_PATH, ESLINT_IGNORE_PATH } from '@monstrs/config'

import { AnnotationLevel, Conclusion }            from '../../types'
import { createCheck }                            from '../../github'
import { isReportExists }                         from '../../utils'

const getAnnotationLevel = severity => {
  if (severity === 1) {
    return AnnotationLevel.Warning
  }
  return AnnotationLevel.Failure
}

export default class LintCommand extends Command {
  static description: string = 'Check ESLint to statically analyze your code'

  static examples: string[] = ['$ mctl check:lint']

  async run(): Promise<void> {
    const reportPath = join(tmpdir(), `eslint-report-${new Date().getTime()}.json`)

    try {
      await execa('eslint', [
        '--ext',
        'js,ts,jsx,tsx',
        process.cwd(),
        '--config',
        ESLINT_CONFIG_PATH,
        '--ignore-path',
        ESLINT_IGNORE_PATH,
        '--format',
        'json-with-metadata',
        '-o',
        reportPath,
      ])
    } catch (error) {
      if (!(await isReportExists(reportPath))) {
        this.log(error.stderr)
      }
    }

    // eslint-disable-next-line
    await this.check(require(reportPath))
  }

  async check({ results }: any): Promise<void> {
    const cwd = process.env.GITHUB_WORKSPACE || process.cwd()
    const annotations = []

    results.forEach(({ filePath, messages = [] }) => {
      if (messages.length === 0) {
        return
      }
      messages.forEach(message => {
        const line = (message.line || 0) + 1
        annotations.push({
          path: filePath.substring(cwd.length + 1),
          start_line: line,
          end_line: line,
          annotation_level: getAnnotationLevel(message.severity),
          raw_details: `(${message.ruleId}): ${message.message}`,
          title: message.ruleId || 'unknown/rule',
          message: message.message,
        })
      })
    })

    const warnings = annotations.filter(annotation => annotation.annotation_level === 'warning')
      .length
    const errors = annotations.filter(annotation => annotation.annotation_level === 'failure')
      .length

    await createCheck('Lint', annotations.length > 0 ? Conclusion.Failure : Conclusion.Success, {
      title: annotations.length > 0 ? `Errors ${errors}, Warnings ${warnings}` : 'Successful',
      summary:
        annotations.length > 0
          ? `Found ${errors} errors and ${warnings} warnings`
          : 'All checks passed',
      annotations,
    })
  }
}
