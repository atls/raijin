import type { SeverityNumber } from '@monstrs/logger'
import type { webpack }        from '@atls/code-runtime/webpack'

export interface WebpackLogRecord {
  record: webpack.StatsError
  severityNumber: SeverityNumber.ERROR | SeverityNumber.WARN
}

export type WebpackEnvironment = 'development' | 'production'

export interface WebpackConfigPlugin {
  name: string
  use: any
  args: Array<any>
}

const ModuleType = {
  commonjs: 'commonjs',
  module: 'module',
} as const

export type ModuleTypes = (typeof ModuleType)[keyof typeof ModuleType]
