import type { ChildProcess } from 'node:child_process'
import type { Writable }     from 'node:stream'
import type webpack          from 'webpack'

import { fork }              from 'node:child_process'
import { join }              from 'node:path'

import { StartServerLogger } from './start-server.logger.js'

export interface StartServerPluginOptions {
  stdout?: Writable
  stderr?: Writable
}

export class StartServerPlugin {
  options: StartServerPluginOptions

  entryFile: string | null = null

  worker: ChildProcess | null = null

  initialized: boolean = false

  logger: StartServerLogger

  constructor(options: Partial<StartServerPluginOptions> = {}) {
    this.logger = new StartServerLogger(options)
    this.options = options
  }

  apply(compiler: webpack.Compiler): void  {
    compiler.hooks.afterEmit.tapAsync({ name: 'StartServerPlugin' }, this.afterEmit)
  }

  private afterEmit = (compilation: webpack.Compilation, callback: () => void): void => {
    if (!this.initialized) {
      this.initialized = true

      callback()
    } else {
      if (this.worker?.connected && this.worker.pid) {
        process.kill(this.worker.pid)
      }

      this.startServer(compilation, callback)
    }
  }

  private startServer = (compilation: webpack.Compilation, callback: () => void): void => {
    this.logger.info('Starting server...')

    this.entryFile = join(compilation.compiler.options.output.path!, 'index.js')

    this.runWorker(this.entryFile, (worker) => {
      this.worker = worker

      callback()
    })
  }

  private runWorker(entryFile: string, callback: (arg0: ChildProcess) => void): void {
    const worker = fork(entryFile, [], {
      silent: true,
    })

    if (this.options.stdout) {
      worker.stdout?.pipe(this.options.stdout, { end: false })
    }

    if (this.options.stderr) {
      worker.stderr?.pipe(this.options.stderr, { end: false })
    }

    setTimeout(() => {
      callback(worker)
    }, 0)
  }
}
