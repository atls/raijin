import type { ProjectGenerationChange }     from '@atls/raijin/application/generation'
import type { ProjectGenerationDiagnostic } from '@atls/raijin/application/generation'
import type { ProjectGenerationFailure }    from '@atls/raijin/application/generation'
import type { ProjectGenerationResult }     from '@atls/raijin/application/generation'
import type { Report }                      from '@yarnpkg/core'

import { MessageName }                      from '@yarnpkg/core'

type ProjectGenerationReport = Pick<Report, 'reportError' | 'reportInfo' | 'reportWarning'>

const changeLabels: Record<ProjectGenerationChange['kind'], string> = {
  created: 'CREATE',
  deleted: 'DELETE',
  renamed: 'RENAME',
  updated: 'UPDATE',
}

const renderChange = (report: ProjectGenerationReport, change: ProjectGenerationChange): void => {
  const renameDestination = change.destination ? ` -> ${change.destination}` : ''
  const size = change.size === undefined ? '' : ` (${change.size} bytes)`

  report.reportInfo(null, `${changeLabels[change.kind]} ${change.path}${renameDestination}${size}`)
}

const renderDiagnostic = (
  report: ProjectGenerationReport,
  diagnostic: ProjectGenerationDiagnostic
): void => {
  switch (diagnostic.level) {
    case 'error':
      report.reportError(MessageName.UNNAMED, diagnostic.message)
      break
    case 'warning':
      report.reportWarning(MessageName.UNNAMED, diagnostic.message)
      break
    case 'debug':
    case 'info':
      report.reportInfo(null, diagnostic.message)
      break
    default:
      break
  }
}

export const renderProjectGenerationFailure = (
  report: ProjectGenerationReport,
  failure: ProjectGenerationFailure
): void => {
  report.reportError(MessageName.UNNAMED, failure.message)
}

export const renderProjectGenerationResult = (
  report: ProjectGenerationReport,
  result: ProjectGenerationResult
): void => {
  result.changes.forEach((change) => {
    renderChange(report, change)
  })
  result.diagnostics.forEach((diagnostic) => {
    renderDiagnostic(report, diagnostic)
  })

  if (result.status === 'failed') {
    renderProjectGenerationFailure(report, result.failure)
  }
}
