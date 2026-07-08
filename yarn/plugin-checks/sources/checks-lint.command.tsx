/* eslint-disable n/no-sync */

import type { LintMessage }             from '@atls/raijin/eslint'
import type { LintResult as Result }    from '@atls/raijin/eslint'
import type { Project }                 from '@yarnpkg/core'

import type { Annotation }              from './github.checks.js'

import { readFileSync }                 from 'node:fs'
import { resolve }                      from 'node:path'

import { BaseCommand }                  from '@yarnpkg/cli'
import { StreamReport }                 from '@yarnpkg/core'
import { MessageName }                  from '@yarnpkg/core'
import { Filename }                     from '@yarnpkg/fslib'
import { codeFrameColumns }             from '@babel/code-frame'
import { execUtils }                    from '@yarnpkg/core'
import { xfs }                          from '@yarnpkg/fslib'
import { npath }                        from '@yarnpkg/fslib'
import { Option }                       from 'clipanion'
import React                            from 'react'

import { LintResult }                   from '@atls/cli-ui-lint-result-component'
import { Linter }                       from '@atls/code-lint'
import { renderStatic }                 from '@atls/cli-ui-renderer-static-component'
import { getChangedFiles }              from '@atls/yarn-plugin-files'
import { resolveProjectCommandContext } from '@atls/yarn-plugin-tools/command-context'
import { makeCurrentYarnExecutable }    from '@atls/yarn-plugin-tools/current-yarn-executable'

import { GitHubChecks }                 from './github.checks.js'
import { AnnotationLevel }              from './github.checks.js'

class ChecksLintCommand extends BaseCommand {
  static override paths = [['checks', 'lint']]

  changed = Option.Boolean('--changed', false)

  override async execute(): Promise<number> {
    const nodeOptions = process.env.NODE_OPTIONS ?? ''

    if (nodeOptions.includes(Filename.pnpCjs) && nodeOptions.includes(Filename.pnpEsmLoader)) {
      return this.executeRegular()
    }

    if (process.env.COMMAND_PROXY_EXECUTION === 'true') {
      return this.executeRegular()
    }

    return this.executeProxy()
  }

  async executeProxy(): Promise<number> {
    const { project } = await resolveProjectCommandContext(this.context.cwd, this.context.plugins)

    const binFolder = await xfs.mktempPromise()
    const args = ['checks', 'lint', ...(this.changed ? ['--changed'] : [])]
    const { executable, env } = await makeCurrentYarnExecutable({
      binFolder,
      project,
      env: {
        COMMAND_PROXY_EXECUTION: 'true',
      },
    })

    const { code } = await execUtils.pipevp(executable, args, {
      cwd: project.cwd,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
      env,
    })

    return code
  }

  async executeRegular(): Promise<number> {
    const { configuration, project } = await resolveProjectCommandContext(
      this.context.cwd,
      this.context.plugins
    )

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
            const linter = await Linter.initialize(project.cwd, project.cwd)
            const lintTargets = await this.getLintTargets(project)
            let results: Array<Result> = []

            if (lintTargets === null) {
              results = await linter.lint()
            } else if (lintTargets.length > 0) {
              results = await linter.lint(lintTargets)
            }

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
            await checks.failure(
              {
                title: 'Lint run failed',
                summary: error instanceof Error ? error.message : (error as string),
              },
              checkId
            )
          }
        })
      }
    )

    return commandReport.exitCode()
  }

  private async getLintTargets(project: Project): Promise<Array<string> | null> {
    if (!this.changed) {
      return null
    }

    const lintTargets = (await getChangedFiles(project)).filter((file) =>
      /\.(c|m)?(j|t)sx?$/.test(file))

    const existsMap = await Promise.all(
      lintTargets.map(async (file) =>
        xfs.existsPromise(npath.toPortablePath(resolve(project.cwd, file))))
    )

    return lintTargets.filter((_, index) => existsMap[index])
  }

  private getAnnotationLevel(severity: LintMessage['severity']): AnnotationLevel {
    if (severity === 1) {
      return AnnotationLevel.Warning
    }

    return AnnotationLevel.Failure
  }

  private formatResults(results: Array<Result>, cwd?: string): Array<Annotation> {
    return results
      .filter((result) => result.messages.length > 0)
      .map((result) =>
        result.messages.map((message) => {
          const line = (message.line || 0) + 1

          return {
            path: cwd ? result.filePath.substring(cwd.length + 1) : result.filePath,
            start_line: line,
            end_line: line,
            annotation_level: this.getAnnotationLevel(message.severity),
            raw_details: codeFrameColumns(
              readFileSync(result.filePath).toString(),
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
