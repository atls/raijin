/* eslint-disable n/no-sync */

import type { CommandInput }               from '@atls/raijin/commands'
import type { ProjectProcessInvocation }   from '@atls/raijin/commands'
import type { ProjectCommandContext }      from '@atls/raijin/commands'
import type { LintDiagnostic }             from '@atls/yarn-plugin-lint'
import type { LintFileResult }             from '@atls/yarn-plugin-lint'
import type { LintProjectCompletedResult } from '@atls/yarn-plugin-lint'
import type { ChangedProjectState }        from '@atls/yarn-plugin-files'
import type { ChangedStateManagedError }   from '@atls/yarn-plugin-files'
import type { Project }                    from '@yarnpkg/core'

import type { Annotation }                 from './github.checks.js'

import { readFileSync }                    from 'node:fs'

import { BaseCommand }                     from '@yarnpkg/cli'
import { StreamReport }                    from '@yarnpkg/core'
import { MessageName }                     from '@yarnpkg/core'
import { codeFrameColumns }                from '@babel/code-frame'
import { xfs }                             from '@yarnpkg/fslib'
import { Option }                          from 'clipanion'

import { createCommandInput }              from '@atls/raijin/commands'
import { toNativeCwd }                     from '@atls/raijin/commands'
import { toNativePath }                    from '@atls/raijin/filesystem'
import { formatChangedStateManagedError }  from '@atls/yarn-plugin-files'
import { resolveChangedProjectStateForEntrypoint } from '@atls/yarn-plugin-files'
import { lintProjectSources }              from '@atls/yarn-plugin-lint'

import { GitHubChecks }                    from './github.checks.js'
import { AnnotationLevel }                 from './github.checks.js'

const getAnnotationLevel = (severity: LintDiagnostic['severity']): AnnotationLevel =>
  severity === 1 ? AnnotationLevel.Warning : AnnotationLevel.Failure

type LintTargetsResult =
  | ChangedStateManagedError
  | {
      readonly kind: 'completed'
      readonly targets: CommandInput | null
    }

export const formatLintAnnotations = (
  results: ReadonlyArray<LintFileResult>,
  cwd?: string
): Array<Annotation> =>
  results
    .filter(({ diagnostics }) => diagnostics.length > 0)
    .flatMap((result) =>
      result.diagnostics.map((diagnostic) => {
        const line = diagnostic.line || 1
        const column = diagnostic.column || 1

        return {
          path: cwd ? result.filePath.substring(cwd.length + 1) : result.filePath,
          start_line: line,
          end_line: line,
          annotation_level: getAnnotationLevel(diagnostic.severity),
          raw_details: codeFrameColumns(
            result.source ?? readFileSync(result.filePath).toString(),
            { start: { line, column } },
            { highlightCode: false }
          ),
          title: `(${diagnostic.ruleId || 'unknown'}): ${diagnostic.message}`,
          message: diagnostic.message,
        }
      }))

export const reportLintOutput = (
  report: Pick<StreamReport, 'reportInfo'>,
  result: LintProjectCompletedResult
): void => {
  if (result.output.length > 0) {
    report.reportInfo(MessageName.UNNAMED, result.output)
  }
}

export const selectChangedLintFiles = (state: ChangedProjectState): ReadonlyArray<string> =>
  state.files
    .filter(({ path, status }) => status !== 'deleted' && /\.(c|m)?(j|t)sx?$/.test(path))
    .map(({ path }) => path)

class ChecksLintCommand extends BaseCommand {
  static override paths = [['checks', 'lint']]

  static override usage = BaseCommand.Usage({
    description: 'report lint results to GitHub Checks',
  })

  changed = Option.Boolean('--changed', false)

  declare context: ProjectCommandContext

  override async execute(): Promise<number> {
    const { invocation } = this.context
    const { project: projectModel, yarn } = invocation
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
            const targetsResult = await this.getLintTargets(project, invocation.process)

            if (targetsResult.kind === 'error') {
              const summary = formatChangedStateManagedError(targetsResult)

              await checks.failure({ title: 'Lint run failed', summary }, checkId)
              report.reportError(MessageName.UNNAMED, summary)

              return
            }

            const lintTargets = targetsResult.targets

            if (lintTargets !== null && lintTargets.targets.length === 0) {
              await checks.complete(checkId, {
                title: 'Successful',
                summary: 'All checks passed',
                annotations: [],
              })

              return
            }

            const result = await lintProjectSources({
              rootCwd: projectCwd,
              cwd: projectCwd,
              targets: lintTargets?.targets.map(({ path }) => toNativePath(path)),
            })

            if (result.status === 'provider-failed') {
              const summary = `${result.failure.name}: ${result.failure.message}`

              await checks.failure({ title: 'Lint run failed', summary }, checkId)
              report.reportError(MessageName.UNNAMED, summary)

              return
            }

            reportLintOutput(report, result)

            const annotations = formatLintAnnotations(result.results, projectCwd)

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
            const summary = error instanceof Error ? error.message : String(error)

            await checks.failure(
              {
                title: 'Lint run failed',
                summary,
              },
              checkId
            )
            report.reportError(MessageName.UNNAMED, summary)
          }
        })
      }
    )

    return commandReport.exitCode()
  }

  private async getLintTargets(
    project: Project,
    processInvocation: ProjectProcessInvocation
  ): Promise<LintTargetsResult> {
    if (!this.changed) {
      return { kind: 'completed', targets: null }
    }

    const result = await resolveChangedProjectStateForEntrypoint({
      processInvocation,
      project,
    })

    if (result.kind === 'error') {
      return result
    }

    const input = createCommandInput({
      cwd: project.cwd,
      source: 'changed',
      targets: selectChangedLintFiles(result.state),
    })

    const existsMap = await Promise.all(
      input.targets.map(async ({ path }) => xfs.existsPromise(path))
    )

    return {
      kind: 'completed',
      targets: {
        ...input,
        targets: input.targets.filter((_, index) => existsMap[index]),
      },
    }
  }
}

export { ChecksLintCommand }
