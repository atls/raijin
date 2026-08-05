import type { ProcessInvocation }  from '@atls/raijin/commands'
import type { ProcessOutputEvent } from '@atls/raijin/commands'
import type { Writable }           from 'node:stream'
import type webpack                from 'webpack'

import { join }                    from 'node:path'

import { StartServerLogger }       from './start-server.logger.js'

export interface StartServerPluginOptions {
  stdout?: Writable
  stderr?: Writable
  execArgv?: Array<string>
}

export const createStartServerArguments = (
  entryFile: string,
  { execArgv }: StartServerPluginOptions,
  parentExecArgv = process.execArgv
): Array<string> => [...parentExecArgv, ...(execArgv ?? []), entryFile]

export class StartServerPlugin {
  options: StartServerPluginOptions

  entryFile: string | null = null

  processController: AbortController | undefined

  initialized: boolean = false

  logger: StartServerLogger

  constructor(
    private readonly processInvocation: ProcessInvocation,
    options: Partial<StartServerPluginOptions> = {}
  ) {
    this.logger = new StartServerLogger(options)
    this.options = options
  }

  apply(compiler: webpack.Compiler): void {
    compiler.hooks.afterEmit.tapAsync({ name: 'StartServerPlugin' }, this.afterEmit)
  }

  private afterEmit = (compilation: webpack.Compilation, callback: () => void): void => {
    if (!this.initialized) {
      this.initialized = true

      callback()
    } else {
      this.processController?.abort()

      this.startServer(compilation, callback)
    }
  }

  private startServer = (compilation: webpack.Compilation, callback: () => void): void => {
    this.logger.info('Starting server...')
    const { path } = compilation.compiler.options.output

    if (path) {
      this.entryFile = join(path, 'index.js')

      this.startProcess(this.entryFile)

      setTimeout(callback, 0)
    }
  }

  private handleOutput = ({ data, source }: ProcessOutputEvent): void => {
    this.options[source]?.write(data)
  }

  private startProcess(entryFile: string): void {
    const processController = new AbortController()

    this.processController = processController

    this.processInvocation
      .execute(process.execPath, createStartServerArguments(entryFile, this.options), {
        output: { mode: 'handle', handler: this.handleOutput },
        signal: processController.signal,
      })
      .then(
        ({ exitCode }) => {
          if (!processController.signal.aborted && exitCode !== 0) {
            this.logger.error(new Error(`Server process exited with code ${exitCode}`))
          }
        },
        (error: unknown) => {
          if (!processController.signal.aborted) {
            this.logger.error(error instanceof Error ? error : new Error(String(error)))
          }
        }
      )
  }
}
