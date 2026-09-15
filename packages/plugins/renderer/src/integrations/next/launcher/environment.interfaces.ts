import type { PortablePath } from '@yarnpkg/fslib'

export interface NextExecutionEnvironmentOptions {
  readonly nextConfigAdapterPath?: PortablePath
  readonly output?: string
}

export interface ExtractedNodeLoader {
  readonly loader: string | undefined
  readonly nodeOptions: string | undefined
}
