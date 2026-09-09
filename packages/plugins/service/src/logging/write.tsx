import type { WorkspaceCommandContext } from '@atls/raijin/commands'

import type { ServiceLogRecord }        from './interfaces.js'

import { SeverityNumber }               from '@atls/logger'
import React                            from 'react'

import { ErrorInfo }                    from '@atls/cli-ui'
import { renderStatic }                 from '@atls/cli-ui'

import { LogRecord }                    from './record.jsx'

type Destination = Pick<WorkspaceCommandContext, 'stderr' | 'stdout'>

const writeLines = (destination: NodeJS.WritableStream, content: string): void => {
  destination.write(`${content.replace(/\n+$/u, '')}\n`)
}

export const writeError = (destination: Destination, error: unknown): void => {
  if (error instanceof Error) {
    writeLines(destination.stderr, renderStatic(<ErrorInfo error={error} />))
  } else {
    writeLines(destination.stderr, String(error))
  }
}

export const writeLogRecord = (
  destination: Destination,
  logRecord: ServiceLogRecord,
  showWarnings = false
): void => {
  if (logRecord instanceof Error) {
    writeError(destination, logRecord)

    return
  }

  if ('record' in logRecord) {
    if (logRecord.severityNumber === SeverityNumber.WARN && !showWarnings) {
      return
    }

    const { record } = logRecord
    const message = typeof record === 'string' ? record : record.message
    const error = new Error(message)

    if (typeof record !== 'string' && record.details) {
      error.stack = record.details
    }

    writeError(destination, error)

    return
  }

  if (
    logRecord.severityNumber !== undefined &&
    logRecord.severityNumber > SeverityNumber.INFO &&
    logRecord.severityNumber <= SeverityNumber.WARN &&
    !showWarnings
  ) {
    return
  }

  writeLines(destination.stdout, renderStatic(<LogRecord {...logRecord} />))
}
