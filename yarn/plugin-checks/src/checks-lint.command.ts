import { BaseCommand }         from '@yarnpkg/cli'
import { Configuration }       from '@yarnpkg/core'
import { Project }             from '@yarnpkg/core'
import { xfs }                 from '@yarnpkg/fslib'
import { ppath }               from '@yarnpkg/fslib'
import { toFilename }          from '@yarnpkg/fslib'

import { eslintResultsFormat } from '@atls/github-checks-utils'
import { Conclusion }          from '@atls/github-checks-utils'
import { createCheck }         from '@atls/github-checks-utils'

class ChecksLintCommand extends BaseCommand {
  static paths = [['checks', 'lint']]

  async execute() {
    const { project } = await Project.find(
      await Configuration.find(this.context.cwd, this.context.plugins),
      this.context.cwd
    )

    const report = ppath.join(await xfs.mktempPromise(), toFilename('report.json'))

    await this.cli.run(['actl', 'lint', '--report', report])

    const results = await xfs.readJsonPromise(report)

    const annotations = eslintResultsFormat(results, project.cwd)

    const warnings: number = annotations.filter(
      (annotation) => annotation.annotation_level === 'warning'
    ).length

    const errors: number = annotations.filter(
      (annotation) => annotation.annotation_level === 'failure'
    ).length

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

export { ChecksLintCommand }
