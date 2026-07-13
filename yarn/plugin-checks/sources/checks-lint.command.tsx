/* eslint-disable n/no-sync */

import type { CommandInput }         from '@atls/raijin/commands'
import type { LintMessage }          from '@atls/raijin/eslint'
import type { LintResult as Result } from '@atls/raijin/eslint'
import type { Project }              from '@yarnpkg/core'

import type { Annotation }           from './github.checks.js'

import { readFileSync }              from 'node:fs'

import { BaseCommand }               from '@yarnpkg/cli'
import { StreamReport }              from '@yarnpkg/core'
import { MessageName }               from '@yarnpkg/core'
import { codeFrameColumns }          from '@babel/code-frame'
import { xfs }                       from '@yarnpkg/fslib'
import { Option }                    from 'clipanion'
import React                         from 'react'

import { LintResult }                from '@atls/cli-ui-lint-result-component'
import { Linter }                    from '@atls/code-lint'
import { renderStatic }              from '@atls/cli-ui-renderer-static-component'
import { createCommandInput }        from '@atls/raijin/commands'
import { proxyProjectCommand }       from '@atls/raijin/commands'
import { resolveProjectInvocation }  from '@atls/raijin/commands'
import { shouldProxyCommand }        from '@atls/raijin/commands'
import { toNativeCwd }               from '@atls/raijin/commands'
import { getChangedFiles }           from '@atls/yarn-plugin-files'

import { GitHubChecks }              from './github.checks.js'
import { AnnotationLevel }           from './github.checks.js'

class ChecksLintCommand extends BaseCommand {
  static override paths = [['checks', 'lint']]

  changed = Option.Boolean('--changed', false)

  override async execute(): Promise<number> {
    if (shouldProxyCommand()) {
      return this.executeProxy()
    }

    return this.executeRegular()
  }

  async executeProxy(): Promise<number> {
    const args = ['checks', 'lint', ...(this.changed ? ['--changed'] : [])]

    return proxyProjectCommand({
      args,
      cwd: this.context.cwd,
      plugins: this.context.plugins,
      stdin: this.context.stdin,
      stdout: this.context.stdout,
      stderr: this.context.stderr,
    })
  }

  async executeRegular(): Promise<number> {
    const { project: projectModel, yarn } = await resolveProjectInvocation(
      this.context.cwd,
      this.context.plugins
    )
    const { configuration, project } = yarn

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
            const projectCwd = toNativeCwd(projectModel.cwd)
            const linter = await Linter.initialize(projectCwd, projectCwd)
            const lintTargets = await this.getLintTargets(project)
            let results: Array<Result> = []

            if (lintTargets === null) {
              results = await linter.lint()
            } else if (lintTargets.targets.length > 0) {
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

            const annotations = this.formatResults(results, projectCwd)

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

  private async getLintTargets(project: Project): Promise<CommandInput | null> {
    if (!this.changed) {
      return null
    }

    const input = createCommandInput({
      cwd: project.cwd,
      source: 'changed',
      targets: (await getChangedFiles(project)).filter((file) => /\.(c|m)?(j|t)sx?$/.test(file)),
    })

    const existsMap = await Promise.all(
      input.targets.map(async ({ path }) => xfs.existsPromise(path))
    )

    return {
      ...input,
      targets: input.targets.filter((_, index) => existsMap[index]),
    }
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
