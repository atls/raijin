import type { SeverityNumber } from '@atls/logger'
import type { webpack }        from '@atls/raijin/webpack'

export type WebpackEnvironment = 'development' | 'production'

export type BuildDiagnostic = {
  record: webpack.StatsError
  severityNumber: SeverityNumber.ERROR | SeverityNumber.WARN
}
