export enum WebpackEnvironment {
  prod = 'production',
  dev = 'development',
}

const ModuleType = {
  commonjs: 'commonjs',
  module: 'module',
} as const

export type ModuleTypes = (typeof ModuleType)[keyof typeof ModuleType]
