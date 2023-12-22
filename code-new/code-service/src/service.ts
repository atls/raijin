import { PassThrough }           from 'node:stream'

import webpack                   from 'webpack'
import { WebpackPluginInstance } from 'webpack'
import { Watching }              from 'webpack'

import { StartServerPlugin }     from '@atls/webpack-start-server-plugin-new'

import { WebpackConfig }         from './webpack.config'
import { WebpackEnvironment }    from './webpack.interfaces'

export interface ServiceBuildResultMessage {
  message: string
}

export interface ServiceBuildResult {
  errors: ServiceBuildResultMessage[]
  warnings: ServiceBuildResultMessage[]
}

export class Service {
  constructor(private readonly cwd: string) {}

  async build(plugins: Array<WebpackPluginInstance> = []): Promise<ServiceBuildResult> {
    const config = new WebpackConfig(this.cwd)

    const compiler = webpack(await config.build())

    return new Promise((resolve, reject) => {
      compiler.run((error, stats) => {
        if (error) {
          if (!error.message) {
            reject(error)
          } else {
            resolve({
              errors: [error],
              warnings: [],
            })
          }
        } else if (stats) {
          const { errors = [], warnings = [] } = stats.toJson()

          resolve({
            errors,
            warnings,
          })
        } else {
          resolve({
            errors: [],
            warnings: [],
          })
        }
      })
    })
  }

  async watch(callback?): Promise<Watching> {
    const config = new WebpackConfig(this.cwd)

    const pass = new PassThrough()

    pass.on('data', (chunk) => {
      chunk
        .toString()
        .split(/\r?\n/)
        .filter(Boolean)
        .forEach((row) => {
          try {
            callback(JSON.parse(row))
          } catch {
            callback({ body: row })
          }
        })
    })

    return webpack(
      await config.build(WebpackEnvironment.dev, [
        new StartServerPlugin({ stdout: pass, stderr: pass }),
      ])
    ).watch({}, (error, stats) => {
      if (error) {
        callback({
          severityText: 'ERROR',
          body: error,
        })
      } else if (stats) {
        const { errors = [], warnings = [] } = stats.toJson()

        warnings.forEach((warning) =>
          callback({
            severityText: 'WARN',
            body: warning,
          }))

        errors.forEach((err) =>
          callback({
            severityText: 'ERROR',
            body: err,
          }))
      }
    })
  }
}
