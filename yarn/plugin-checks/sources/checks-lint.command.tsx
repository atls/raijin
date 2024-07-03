import type { ESLint }      from '@atls/code-runtime/eslint'

import { readFileSync }     from 'node:fs'

import { BaseCommand }      from '@yarnpkg/cli'
import { StreamReport }     from '@yarnpkg/core'
import { Configuration }    from '@yarnpkg/core'
import { MessageName }      from '@yarnpkg/core'
import { Project }          from '@yarnpkg/core'
import { codeFrameColumns } from '@babel/code-frame'
import React                from 'react'

import { ESLintResult }     from '@atls/cli-ui-eslint-result-component'
import { LinterWorker }     from '@atls/code-lint-worker'
import { renderStatic }     from '@atls/cli-ui-renderer'

// @ts-expect-error any
import { GitHubChecks }     from './github.checks.ts'
// @ts-expect-error any
import { AnnotationLevel }  from './github.checks.ts'
// @ts-expect-error any
import { Annotation }       from './github.checks.ts'

class ChecksLintCommand extends BaseCommand {
  static paths = [['checks', 'lint']]

  async execute() {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        const checks = new GitHubChecks('Lint')

        // @ts-expect-error any
        const { id: checkId } = await checks.start()

        // @ts-expect-error any eslint-disable-next-line consistent-return
        const results = await report.startTimerPromise('Lint', async () => {
          try {
            return await new LinterWorker(project.cwd).run(this.context.cwd)
          } catch (error) {
            await checks.failure({
              title: 'Lint run failed',
              summary: (error as any).message,
            })
          }
        })

        if (results) {
          results
            .filter((result) => result.messages.length > 0)
            .forEach((result) => {
              const output = renderStatic(<ESLintResult {...result} />)

              output.split('\n').forEach((line) => report.reportInfo(MessageName.UNNAMED, line))
            })

          const annotations = this.formatResults(results, project.cwd)

          const warnings: number = annotations.filter(
            (annotation) => annotation.annotation_level === 'warning'
          ).length

          const errors: number = annotations.filter(
            (annotation) => annotation.annotation_level === 'failure'
          ).length

          await checks.complete(checkId, {
            title: annotations.length > 0 ? `Errors ${errors}, Warnings ${warnings}` : 'Successful',
            summary:
              annotations.length > 0
                ? `Found ${errors} errors and ${warnings} warnings`
                : 'All checks passed',
            annotations,
          })
        }
      }
    )

    return commandReport.exitCode()
  }

  // @ts-expect-error any
  private getAnnotationLevel(severity: ESLint.Severity): AnnotationLevel {
    if (severity === 1) {
      return AnnotationLevel.Warning
    }

    return AnnotationLevel.Failure
  }

  private formatResults(results: Array<ESLint.LintResult>, cwd?: string): Array<Annotation> {
    return results
      .filter((result) => result.messages?.length > 0)
      .map(({ filePath, messages = [] }) =>
        messages.map((message) => {
          const line = (message.line || 0) + 1

          return {
            path: cwd ? filePath.substring(cwd.length + 1) : filePath,
            start_line: line,
            end_line: line,
            annotation_level: this.getAnnotationLevel(message.severity),
            raw_details: codeFrameColumns(
              readFileSync(filePath).toString(),
              {
                start: { line: message.line || 0, column: message.column || 0 },
              },
              { highlightCode: false }
            ),
            title: `(${message.ruleId}): ${message.message}`,
            message: message.message,
          }
        }))
      .flat()
  }
}

export { ChecksLintCommand }
