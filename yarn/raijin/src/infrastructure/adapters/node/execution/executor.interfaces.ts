import type { Environment } from './environment.interfaces.js'

export interface ExecutorOptions {
  environment: Environment
  loader: {
    resolve: (cwd: string) => Promise<string>
  }
}
