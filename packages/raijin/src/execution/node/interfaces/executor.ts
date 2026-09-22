import type { Streams }     from '../../subprocess/execute.interfaces.js'
import type { Environment } from './environment.js'

export interface ExecutorOptions {
  environment: Environment
  loader: {
    resolve: (cwd: string) => Promise<string>
  }
  streams: Streams
}
