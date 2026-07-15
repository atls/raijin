import type { PortablePath } from '@yarnpkg/fslib'

export type NextConfigShape = Record<string, unknown> & {
  adapterPath?: string
  experimental?: Record<string, unknown> & {
    adapterPath?: string
    extensionAlias?: Record<string, ReadonlyArray<string>>
  }
  output?: string
  turbopack?: Record<string, unknown> & {
    root?: string
  }
  webpack?: (config: Record<string, unknown>, context: unknown) => unknown
}

export interface MaterializeNextConfigAdapterOptions {
  readonly cwd: PortablePath
}
