import sysPath           from 'path'
import { EntryPlugin }           from 'webpack'
import { ChildProcess }  from 'child_process'
import { Writable }      from 'stream'
import { fork }          from 'child_process'
import { createRequire } from 'module'

export interface StartServerPluginOptions {
  verbose: boolean
  entryName: string
  stdout?: Writable
  stderr?: Writable
  onWorkerStart?: (workeer: ChildProcess) => void
  onWorkerExit?: () => void
}

export class StartServerPlugin {
  options: StartServerPluginOptions

  entryFile: string | null = null

  worker: ChildProcess | null = null

  workerLoaded: boolean = false

  constructor(options: Partial<StartServerPluginOptions> = {}) {
    this.options = {
      verbose: true,
      entryName: 'index',
      ...options,
    }
  }

  getEntryFile(compilation) {
    const { entryName } = this.options
    const { entrypoints } = compilation
    const entry = entrypoints.get ? entrypoints.get(entryName) : entrypoints[entryName]

    if (!entry) {
      throw new Error(
        `Requested entry "${entryName}" does not exist, try one of: ${(entrypoints.keys
          ? entrypoints.keys()
          : Object.keys(entrypoints)
        ).join(' ')}`
      )
    }

    /* eslint-disable no-underscore-dangle */

    const entryScript = EntryPlugin
      ? entry._runtimeChunk.files.values().next().value
      : entry.chunks[0].files[0]

    /* eslint-enable no-underscore-dangle */

    if (!entryScript) {
      this.error(`Entry chunk not outputted: ${entry}`)

      return null
    }

    const { path } = compilation.outputOptions

    return sysPath.resolve(path, entryScript)
  }

  handleWorkerExit = (code, signal) => {
    if (code) {
      this.error(`script exited with code: ${code}`)
    }

    if (signal && signal !== 'SIGTERM') {
      this.error(`script exited after signal ${signal}`)
    }

    this.worker = null

    if (this.options.onWorkerExit) {
      this.options.onWorkerExit()
    }

    if (!this.workerLoaded) {
      this.error('Script did not load, or HMR failed; not restarting')

      return
    }

    this.workerLoaded = false

    if (this.entryFile) {
      this.runWorker(this.entryFile)
    }
  }

  handleWorkerError = (err) => {
    this.error(err)

    this.worker = null

    if (this.options.onWorkerExit) {
      this.options.onWorkerExit()
    }
  }

  handleWorkerMessage = (message) => {
    if (message === 'SSWP_LOADED') {
      this.workerLoaded = true

      this.info('Script loaded')
    } else if (message === 'SSWP_HMR_FAIL') {
      this.workerLoaded = false
    }
  }

  runWorker(entryFile: string, callback?) {
    if (this.worker) return

    if (this.options.verbose) {
      this.info(`running \`node ${entryFile}\``)
    }

    const worker = fork(entryFile, [], {
      silent: true,
    })

    worker.once('exit', this.handleWorkerExit)
    worker.once('error', this.handleWorkerError)
    worker.on('message', this.handleWorkerMessage)

    if (this.options.stdout) {
      worker.stdout?.pipe(this.options.stdout, { end: false })
    }

    if (this.options.stderr) {
      worker.stderr?.pipe(this.options.stderr, { end: false })
    }

    this.worker = worker

    if (this.options.onWorkerStart) {
      this.options.onWorkerStart(worker)
    }

    if (callback) callback()
  }

  hmrWorker(compilation, callback) {
    if (this.worker?.send) {
      this.worker.send('SSWP_HMR')
    } else {
      this.error('hot reloaded but no way to tell the worker')
    }

    callback()
  }

  afterEmit = (compilation, callback) => {
    const entryFile = this.getEntryFile(compilation)

    if (entryFile) {
      this.entryFile = entryFile
    }

    if (this.worker) {
      this.hmrWorker(compilation, callback)
    } else if (this.entryFile) {
      this.runWorker(this.entryFile, callback)
    }
  }

  getMonitor() {
    const loaderPath = createRequire(import.meta.url).resolve('./monitor.loader')

    return `!!${loaderPath}!${loaderPath}`
  }

  apply = (compiler) => {
    const plugin = { name: 'StartServerPlugin' }

    compiler.hooks.make.tap(plugin, (compilation) => {
      compilation.addEntry(
        compilation.compiler.context,
        EntryPlugin.createDependency(this.getMonitor(), {
          name: this.options.entryName,
        }),
        this.options.entryName,
        // eslint-disable-next-line @typescript-eslint/no-empty-function
        () => {}
      )
    })

    compiler.hooks.afterEmit.tapAsync(plugin, this.afterEmit)
  }

  info(body) {
    if (this.options.stdout) {
      this.options.stdout.write(
        Buffer.from(
          JSON.stringify({
            severityText: 'INFO',
            name: 'start-server',
            body,
          })
        )
      )
    }
  }

  error(body) {
    if (this.options.stderr) {
      this.options.stderr.write(
        Buffer.from(
          JSON.stringify({
            severityText: 'ERROR',
            name: 'start-server',
            body,
          })
        )
      )
    }
  }
}
