import { DiagnosticCategory } from 'typescript'
import { Diagnostic }         from 'typescript'

import { DiagnosticGroup }    from './constants'

export interface GroupedDiagnostics {
  [DiagnosticGroup.Warning]: Array<Diagnostic>
  [DiagnosticGroup.Error]: Array<Diagnostic>
  [DiagnosticGroup.Suggestion]: Array<Diagnostic>
  [DiagnosticGroup.Message]: Array<Diagnostic>
}

export const groupDiagnostics = (diagnostics: Array<Diagnostic> = []): GroupedDiagnostics =>
  diagnostics.reduce(
    (result: GroupedDiagnostics, diagnostic) => {
      if (diagnostic.category === DiagnosticCategory.Error) {
        result[DiagnosticGroup.Error].push(diagnostic)
      } else if (diagnostic.category === DiagnosticCategory.Warning) {
        result[DiagnosticGroup.Warning].push(diagnostic)
      } else if (diagnostic.category === DiagnosticCategory.Suggestion) {
        result[DiagnosticGroup.Suggestion].push(diagnostic)
      } else if (diagnostic.category === DiagnosticCategory.Message) {
        result[DiagnosticGroup.Message].push(diagnostic)
      }

      return result
    },
    {
      [DiagnosticGroup.Warning]: [],
      [DiagnosticGroup.Error]: [],
      [DiagnosticGroup.Suggestion]: [],
      [DiagnosticGroup.Message]: [],
    }
  )
