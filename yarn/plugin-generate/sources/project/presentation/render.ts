import type { ScaffoldChange }     from '@atls/raijin/application/generation'
import type { ScaffoldDiagnostic } from '@atls/raijin/application/generation'
import type { ScaffoldFailure }    from '@atls/raijin/application/generation'
import type { ScaffoldResult }     from '@atls/raijin/application/generation'

import type { RenderReport }       from './render.interfaces.js'

import { MessageName }             from '@yarnpkg/core'

const changeLabels: Record<ScaffoldChange['kind'], string> = {
  created: 'CREATE',
  deleted: 'DELETE',
  renamed: 'RENAME',
  updated: 'UPDATE',
}

const renderChange = (report: RenderReport, change: ScaffoldChange): void => {
  const renameDestination = change.destination ? ` -> ${change.destination}` : ''
  const size = change.size === undefined ? '' : ` (${change.size} bytes)`

  report.reportInfo(null, `${changeLabels[change.kind]} ${change.path}${renameDestination}${size}`)
}

const renderDiagnostic = (report: RenderReport, diagnostic: ScaffoldDiagnostic): void => {
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

export const renderScaffoldFailure = (report: RenderReport, failure: ScaffoldFailure): void => {
  report.reportError(MessageName.UNNAMED, failure.message)
}

export const renderScaffoldResult = (report: RenderReport, result: ScaffoldResult): void => {
  result.changes.forEach((change) => {
    renderChange(report, change)
  })
  result.diagnostics.forEach((diagnostic) => {
    renderDiagnostic(report, diagnostic)
  })

  if (result.status === 'failed') {
    renderScaffoldFailure(report, result.failure)
  }
}
