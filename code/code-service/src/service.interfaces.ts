import type { LogRecord }        from '@opentelemetry/api-logs'

import type { WebpackLogRecord } from './webpack.interfaces.js'

export type ServiceLogRecord = Error | LogRecord | WebpackLogRecord
