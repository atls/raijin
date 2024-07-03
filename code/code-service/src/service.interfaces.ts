import type { LogRecord }        from '@monstrs/logger'

import type { WebpackLogRecord } from './webpack.interfaces.js'

export type ServiceLogRecord = Error | LogRecord | WebpackLogRecord
