import type { SeverityNumber }              from '@monstrs/logger'
import type { materializeTypeScriptConfig } from '@atls/raijin/config/typescript'
import type { typescriptDefaults }          from '@atls/raijin/config/typescript'
import type { webpack }                     from '@atls/raijin/webpack'

export interface WebpackLogRecord {
  record: webpack.StatsError
  severityNumber: SeverityNumber.ERROR | SeverityNumber.WARN
}

export type WebpackEnvironment = 'development' | 'production'

export interface TypeScriptConfigRuntime {
  materializeTypeScriptConfig: typeof materializeTypeScriptConfig
  typescriptDefaults: typeof typescriptDefaults
}

export interface WebpackConfigPlugin {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  use: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: Array<any>
}
