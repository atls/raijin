/* eslint-disable n/no-sync */

import type { ESLint }             from '@monstrs/tools-runtime/eslint'
import type { Linter as ESLinter } from '@monstrs/tools-runtime/eslint'

import type { Annotation }       from './github.checks.ts'

import { readFileSync }     from 'node:fs'

import { BaseCommand }      from '@yarnpkg/cli'
import { StreamReport }     from '@yarnpkg/core'
import { Configuration }    from '@yarnpkg/core'
import { MessageName }      from '@yarnpkg/core'
import { Project }          from '@yarnpkg/core'
import { Filename }                from '@yarnpkg/fslib'
import { codeFrameColumns }        from '@babel/code-frame'
import { execUtils }               from '@yarnpkg/core'
import { scriptUtils }             from '@yarnpkg/core'
import { xfs }                     from '@yarnpkg/fslib'
import React                from 'react'

import { LintResult }     from '@atls/cli-ui-eslint-result-component'
import { Linter }                  from '@atls/code-lint'
import { renderStatic }     from '@atls/cli-ui-renderer-static-component'

import { GitHubChecks }     from './github.checks.ts'
import { AnnotationLevel }  from './github.checks.ts'

class ChecksLintCommand extends BaseCommand {
  static paths = [['checks', 'lint']]

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular()
    }

    return this.executeProxy()
  }

  async executeProxy(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const binFolder = await xfs.mktempPromise()

    const { code } = await execUtils.pipevp('yarn', ['checks', 'lint'], {
      cwd: this.context.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env: await scriptUtils.makeScriptEnv({ binFolder, project }),
    })

    return code
  }

  async executeRegular(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins)
    const { project } = await Project.find(configuration, this.context.cwd)

    const commandReport = await StreamReport.start(
      {
        stdout: this.context.stdout,
        configuration,
      },
      async (report) => {
        const checks = new GitHubChecks('Lint')

        const { id: checkId } = await checks.start()

        await report.startTimerPromise('Lint', async () => {
          try {
            const linter = await Linter.initialize(project.cwd, this.context.cwd)
            const results = await linter.lint()

            results
              .filter((result) => result.messages.length > 0)
              .forEach((result) => {
                const output = renderStatic(<LintResult {...result} />)

                output.split('\n').forEach((line) => {
                  report.reportInfo(MessageName.UNNAMED, line)
                })
              })

            const annotations = this.formatResults(results, project.cwd)

            const warnings: number = annotations.filter(
              (annotation) => annotation.annotation_level === AnnotationLevel.Warning
            ).length

            const errors: number = annotations.filter(
              (annotation) => annotation.annotation_level === AnnotationLevel.Failure
            ).length

            await checks.complete(checkId, {
              title:
                annotations.length > 0 ? `Errors ${errors}, Warnings ${warnings}` : 'Successful',
              summary:
                annotations.length > 0
                  ? `Found ${errors} errors and ${warnings} warnings`
                  : 'All checks passed',
              annotations,
            })
          } catch (error) {
            await checks.failure({
              title: 'Lint run failed',
              summary: error instanceof Error ? error.message : (error as string),
            })
          }
        })
      }
    )

    return commandReport.exitCode()
  }

  private getAnnotationLevel(severity: ESLinter.Severity): AnnotationLevel {
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
            title: `(${message.ruleId || 'unknown'}): ${message.message}`,
            message: message.message,
          }
        }))
      .flat()
  }
}

export { ChecksLintCommand }
