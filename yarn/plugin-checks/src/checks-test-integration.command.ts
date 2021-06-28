import { BaseCommand }           from '@yarnpkg/cli'
import { Configuration }         from '@yarnpkg/core'
import { Project }               from '@yarnpkg/core'
import { xfs }                   from '@yarnpkg/fslib'
import { ppath }                 from '@yarnpkg/fslib'
import { toFilename }            from '@yarnpkg/fslib'

import { formatJestTestResults } from '@atls/github-checks-utils'
import { Conclusion }            from '@atls/github-checks-utils'
import { createCheck }           from '@atls/github-checks-utils'

class ChecksTestIntegrationCommand extends BaseCommand {
  static paths = [['checks', 'test', 'integration']]

  async execute() {
    const { project } = await Project.find(
      await Configuration.find(this.context.cwd, this.context.plugins),
      this.context.cwd
    )

    const report = ppath.join(await xfs.mktempPromise(), toFilename('report.json'))

    await this.cli.run(['actl', 'test:integration', '--report', report])

    const results = await xfs.readJsonPromise(report)

    const annotations = formatJestTestResults(results, project.cwd)

    await createCheck(
      'Test:Integration',
      annotations.length > 0 ? Conclusion.Failure : Conclusion.Success,
      {
        title: annotations.length > 0 ? `Errors ${annotations.length}` : 'Successful',
        summary:
          annotations.length > 0 ? `Found ${annotations.length} errors` : 'All checks passed',
        annotations,
      }
    )
  }
}

export { ChecksTestIntegrationCommand }
