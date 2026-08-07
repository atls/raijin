import type { GenerateProjectResult }       from '@atls/raijin/application/generation/project'
import type { CommandContext }              from '@yarnpkg/core'
import type { Configuration }               from '@yarnpkg/core'
import type { StreamReport }                from '@yarnpkg/core'

import { MessageName }                      from '@yarnpkg/core'
import { StreamReport as YarnStreamReport } from '@yarnpkg/core'

type ProjectGenerationReport = Pick<StreamReport, 'reportError' | 'reportInfo'>

const unreachableProjectChange = (change: never): never => {
  throw new TypeError(`Unsupported project change: ${JSON.stringify(change)}`)
}

export const reportProjectGeneration = (
  report: ProjectGenerationReport,
  result: GenerateProjectResult
): void => {
  if (result.status !== 'generated') {
    report.reportError(MessageName.UNNAMED, result.failure.message)

    return
  }

  if (result.changes.length === 0) {
    report.reportInfo(MessageName.UNNAMED, 'Project scaffold is already current')

    return
  }

  for (const change of result.changes) {
    switch (change.kind) {
      case 'created':
      case 'updated':
        report.reportInfo(
          MessageName.UNNAMED,
          `${change.kind === 'created' ? 'CREATE' : 'UPDATE'} ${change.artifact} (${change.bytes} bytes)`
        )
        break
      case 'deleted':
        report.reportInfo(MessageName.UNNAMED, `DELETE ${change.artifact}`)
        break
      case 'renamed':
        report.reportInfo(MessageName.UNNAMED, `RENAME ${change.artifact} -> ${change.destination}`)
        break
      default:
        unreachableProjectChange(change)
    }
  }
}

export const presentProjectGeneration = async (
  context: Pick<CommandContext, 'stdout'>,
  configuration: Configuration,
  result: GenerateProjectResult
): Promise<number> => {
  const report = await YarnStreamReport.start({ configuration, stdout: context.stdout }, async (
    streamReport
  ) => {
    reportProjectGeneration(streamReport, result)
  })

  return report.exitCode()
}
