import type { ServiceLogRecord } from '@atls/code-service'
import type { StreamReport }     from '@yarnpkg/core'

import { SeverityNumber }        from '@monstrs/logger'
import { BaseCommand }           from '@yarnpkg/cli'
import { MessageName }           from '@yarnpkg/core'
import { Option }                from 'clipanion'
import React                     from 'react'

import { ErrorInfo }             from '@atls/cli-ui-error-info-component'
import { LogRecord }             from '@atls/cli-ui-log-record-component'
import { renderStatic }          from '@atls/cli-ui-renderer'

export abstract class AbstractServiceCommand extends BaseCommand {
  showWarnings = Option.Boolean('-w,--show-warnings', false)

  renderLogRecord(logRecord: ServiceLogRecord, report: StreamReport): void {
    if (logRecord instanceof Error) {
      renderStatic(<ErrorInfo error={logRecord} />, process.stdout.columns - 12)
        .split('\n')
        .forEach((line) => {
          report.reportError(MessageName.UNNAMED, line)
        })
    } else if ('severityNumber' in logRecord && 'record' in logRecord) {
      renderStatic(<ErrorInfo error={logRecord.record as Error} />, process.stdout.columns - 12)
        .split('\n')
        .forEach((line) => {
          if (logRecord.severityNumber === SeverityNumber.WARN) {
            if (this.showWarnings) {
              report.reportWarning(MessageName.UNNAMED, line)
            }
          } else {
            report.reportError(MessageName.UNNAMED, line)
          }
        })
    } else if ('severityNumber' in logRecord) {
      renderStatic(<LogRecord {...logRecord} />, process.stdout.columns - 12)
        .split('\n')
        .forEach((line) => {
          if (logRecord.severityNumber! <= SeverityNumber.INFO) {
            report.reportInfo(MessageName.UNNAMED, line)
          } else if (logRecord.severityNumber! <= SeverityNumber.WARN) {
            if (this.showWarnings) {
              report.reportWarning(MessageName.UNNAMED, line)
            }
          } else {
            report.reportError(MessageName.UNNAMED, line)
          }
        })
    } else {
      report.reportWarning(MessageName.UNNAMED, `Unknown record type: ${JSON.stringify(logRecord)}`)
    }
  }
}
