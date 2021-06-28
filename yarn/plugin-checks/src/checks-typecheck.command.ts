import { BaseCommand }      from '@yarnpkg/cli'
import { Configuration }    from '@yarnpkg/core'
import { Project }          from '@yarnpkg/core'
import { xfs }              from '@yarnpkg/fslib'
import { ppath }            from '@yarnpkg/fslib'
import { toFilename }       from '@yarnpkg/fslib'
import { codeFrameColumns } from '@babel/code-frame'

import { AnnotationLevel }  from '@atls/github-checks-utils'
import { Conclusion }       from '@atls/github-checks-utils'
import { createCheck }      from '@atls/github-checks-utils'

class ChecksTypeCheckCommand extends BaseCommand {
  static paths = [['checks', 'typecheck']]

  async execute() {
    const { project } = await Project.find(
      await Configuration.find(this.context.cwd, this.context.plugins),
      this.context.cwd
    )

    const patterns = project.topLevelWorkspace.manifest.workspaceDefinitions.map(
      (definition) => definition.pattern
    )

    const report = ppath.join(await xfs.mktempPromise(), toFilename('report.json'))

    await this.cli.run(['actl', 'typecheck', '--report', report, ...patterns])

    const diagnostics = await xfs.readJsonPromise(report)

    const annotations = diagnostics.map((diagnostic) => ({
      path: ppath.normalize(ppath.relative(project.cwd, diagnostic.file.fileName)),
      title: diagnostic.messageText,
      message: diagnostic.messageText,
      start_line: diagnostic.file.position.line + 1,
      end_line: diagnostic.file.position.line + 1,
      raw_details: codeFrameColumns(
        xfs.readFileSync(diagnostic.file.fileName).toString(),
        {
          start: {
            line: diagnostic.file.position.line + 1,
            column: diagnostic.file.position.character + 1,
          },
        },
        { highlightCode: false }
      ),
      annotation_level: AnnotationLevel.Failure,
    }))

    const conclusion = annotations.length > 0 ? Conclusion.Failure : Conclusion.Success

    await createCheck('TypeCheck', conclusion, {
      title: conclusion === Conclusion.Failure ? `Errors ${annotations.length}` : 'Successful',
      summary:
        conclusion === Conclusion.Failure
          ? `Found ${annotations.length} errors`
          : 'All checks passed',
      annotations,
    })
  }
}

export { ChecksTypeCheckCommand }
