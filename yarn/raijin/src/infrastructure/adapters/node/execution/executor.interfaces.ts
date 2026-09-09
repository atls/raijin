import type { Streams }     from '../../../providers/execa/subprocess/execute.interfaces.js'
import type { Environment } from './environment.interfaces.js'

export interface ExecutorOptions {
  environment: Environment
  loader: {
    resolve: (cwd: string) => Promise<string>
  }
  streams: Streams
}
