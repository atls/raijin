import type { webpack as wp }       from '@atls/code-runtime/webpack'

import type { ServiceLogRecord }    from './service.interfaces.js'

import EventEmitter                 from 'node:events'
import { PassThrough }              from 'node:stream'

import { SeverityNumber }           from '@monstrs/logger'

import { StartServerPlugin }        from '@atls/webpack-start-server-plugin'

import { WebpackConfig }            from './webpack.config.js'

export class Service extends EventEmitter {
  protected constructor(
    private readonly webpack: typeof wp,
    private readonly config: WebpackConfig
  ) {
    super()
  }

  static async initialize(cwd: string): Promise<Service> {
    const { webpack, nullLoaderPath, tsLoaderPath, nodeLoaderPath } = await import(
      '@atls/code-runtime/webpack'
    )

    const config = new WebpackConfig(
      webpack,
      {
        nodeLoader: nodeLoaderPath,
        nullLoader: nullLoaderPath,
        tsLoader: tsLoaderPath,
      },
      cwd
    )

    return new Service(webpack, config)
  }

  async build(): Promise<Array<ServiceLogRecord>> {
    const compiler = this.webpack(
      await this.config.build('production', [
        {
          name: 'progress',
          use: this.webpack.ProgressPlugin,
          args: [
            (percent: number, message: string): void => {
              this.emit('build:progress', { percent: percent * 100, message })
            },
          ],
        },
      ])
    )

    return new Promise((resolve, reject) => {
      compiler.run((error, stats) => {
        this.emit('end', { error, stats })

        if (error) {
          if (!error.message) {
            reject(error)
          } else {
            resolve([error])
          }
        } else if (stats) {
          const { errors = [], warnings = [] } = stats.toJson()

          resolve([
            ...errors.map((record) => ({ record, severityNumber: SeverityNumber.ERROR })),
            ...warnings.map((record) => ({ record, severityNumber: SeverityNumber.WARN })),
          ])
        } else {
          resolve([])
        }
      })
    })
  }

  async watch(callback: (logRecord: ServiceLogRecord) => void): Promise<wp.Watching> {
    const pass = new PassThrough()

    pass.on('data', (chunk: Buffer) => {
      chunk
        .toString()
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((row: string) => {
          try {
            callback(JSON.parse(row) as ServiceLogRecord)
          } catch {
            callback({ severityNumber: SeverityNumber.INFO, body: row })
          }
        })
    })

    return this.webpack(
      await this.config.build('development', [
        {
          name: 'start-server',
          use: StartServerPlugin,
          args: [
            {
              stdout: pass,
              stderr: pass,
            },
          ],
        },
        {
          name: 'progress',
          use: this.webpack.ProgressPlugin,
          args: [
            (percent: number, message: string): void => {
              this.emit('build:progress', { percent: percent * 100, message })
            },
          ],
        },
      ])
    ).watch({}, (error, stats) => {
      this.emit('end', { error, stats })

      if (error) {
        callback(error)
      } else if (stats) {
        const { errors = [], warnings = [] } = stats.toJson()

        warnings.forEach((record) => {
          callback({ record, severityNumber: SeverityNumber.WARN })
        })

        errors.forEach((record) => {
          callback({ record, severityNumber: SeverityNumber.ERROR })
        })
      }
    })
  }
}
