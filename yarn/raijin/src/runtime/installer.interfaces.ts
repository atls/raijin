import type { FetchLike } from './download.interfaces.js'

export interface InstallRaijinRuntimeOptions {
  cwd: string
  fetchImpl: FetchLike
}
