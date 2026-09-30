import type { LogRecord }       from '@atls/logger'

import type { BuildDiagnostic } from '../build/interfaces.js'

export type ServiceLogRecord = BuildDiagnostic | Error | LogRecord
