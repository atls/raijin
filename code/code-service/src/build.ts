import webpack                 from 'webpack'

import { createWebpackConfig } from './webpack'

export interface BuildOptions {
  cwd: string
}

export interface BuildResult {
  errors: any[]
  warnings: any[]
}

export const build = async ({ cwd }: BuildOptions, plugins?: any): Promise<BuildResult> => {
  const config = await createWebpackConfig(cwd, 'production', plugins)

  const compiler = webpack(config)

  return new Promise((resolve, reject) => {
    compiler.run((error: any, stats) => {
      if (error) {
        if (!error.message) {
          reject(error)
        } else {
          resolve({
            errors: [{ message: error.message }],
            warnings: [],
          })
        }
      } else if (stats) {
        const { errors = [], warnings = [] } = stats.toJson()

        resolve({
          // eslint-disable-next-line
          errors: errors.map((error) => ({ message: error.message })),
          warnings: warnings.map((warning) => ({ message: warning.message })),
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
