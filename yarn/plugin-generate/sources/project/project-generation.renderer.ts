import type { GeneratedProjectArtifact }    from '@atls/raijin/application/generation'
import type { ProjectGenerationDiagnostic } from '@atls/raijin/application/generation'
import type { ProjectGenerationFailure }    from '@atls/raijin/application/generation'
import type { ProjectGenerationResult }     from '@atls/raijin/application/generation'

import type { ProjectGenerationReport }     from './project-generation.renderer.interfaces.js'

import { MessageName }                      from '@yarnpkg/core'

const renderArtifact = (
  report: ProjectGenerationReport,
  artifact: GeneratedProjectArtifact
): void => {
  const renameDestination = artifact.destination ? ` -> ${artifact.destination}` : ''
  const size = artifact.size === undefined ? '' : ` (${artifact.size} bytes)`

  report.reportInfo(
    null,
    `${artifact.operation.toUpperCase()} ${artifact.path}${renameDestination}${size}`
  )
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
  result.artifacts.forEach((artifact) => {
    renderArtifact(report, artifact)
  })
  result.diagnostics.forEach((diagnostic) => {
    renderDiagnostic(report, diagnostic)
  })

  if (result.status === 'failed') {
    renderProjectGenerationFailure(report, result.failure)
  }
}
