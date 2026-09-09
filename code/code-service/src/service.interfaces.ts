import type { LogRecord }        from '@atls/logger'

import type { WebpackLogRecord } from './webpack.interfaces.js'

export type ServiceLogRecord = Error | LogRecord | WebpackLogRecord
