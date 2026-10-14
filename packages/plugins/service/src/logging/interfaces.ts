import type { LogRecord }       from '@atls/logger'

import type { BuildDiagnostic } from '../build/interfaces.js'

export interface ServiceLoggerRecord extends LogRecord {
  body: string
  namespace?: string
  stack?: string
}

export type ServiceLogRecord = BuildDiagnostic | Error | ServiceLoggerRecord
