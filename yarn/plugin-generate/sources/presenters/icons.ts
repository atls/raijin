import type { GenerateIconsResult }         from '@atls/raijin/application/generation/icons'
import type { CommandContext }              from '@yarnpkg/core'
import type { Configuration }               from '@yarnpkg/core'
import type { StreamReport }                from '@yarnpkg/core'

import { MessageName }                      from '@yarnpkg/core'
import { StreamReport as YarnStreamReport } from '@yarnpkg/core'

type IconGenerationReport = Pick<StreamReport, 'reportError' | 'reportInfo'>

const unreachableIconGeneration = (result: never): never => {
  throw new TypeError(`Unsupported icon generation result: ${JSON.stringify(result)}`)
}

export const reportIconGeneration = (
  report: IconGenerationReport,
  result: GenerateIconsResult
): void => {
  switch (result.status) {
    case 'generated':
      report.reportInfo(
        MessageName.UNNAMED,
        `Generated ${result.files.length.toString()} icon artifacts`
      )

      return
    case 'rejected':
      report.reportError(
        MessageName.UNNAMED,
        `Duplicate icon components: ${result.components.join(', ')}`
      )

      return
    case 'failed':
      report.reportError(
        MessageName.UNNAMED,
        `${result.reason === 'format-failed' ? 'Format' : 'Lint'} failed with exit code ${result.exitCode.toString()}`
      )

      return
    default:
      unreachableIconGeneration(result)
  }
}

const present = async (
  context: Pick<CommandContext, 'stdout'>,
  configuration: Configuration,
  callback: (report: IconGenerationReport) => void
): Promise<number> => {
  const report = await YarnStreamReport.start({ configuration, stdout: context.stdout }, async (
    streamReport
  ) => {
    callback(streamReport)
  })

  return report.exitCode()
}

export const presentIconGeneration = async (
  context: Pick<CommandContext, 'stdout'>,
  configuration: Configuration,
  result: GenerateIconsResult
): Promise<number> => {
  const exitCode = await present(context, configuration, (report) => {
    reportIconGeneration(report, result)
  })

  return result.status === 'failed' ? result.exitCode : exitCode
}

export const presentIconGenerationError = async (
  context: Pick<CommandContext, 'stdout'>,
  configuration: Configuration,
  error: unknown
): Promise<number> =>
  present(context, configuration, (report) => {
    report.reportError(MessageName.UNNAMED, error instanceof Error ? error.message : String(error))
  })
