import type { FetchLike } from './runtime-download.interfaces.js'

export interface InstallRaijinRuntimeOptions {
  cwd: string
  fetchImpl: FetchLike
}
