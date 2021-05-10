/* eslint-disable no-shadow */

import path                   from 'path'
import webpack                from 'webpack'
import Config                 from 'webpack-chain'
import { Stats }              from 'webpack'
import { createFsFromVolume } from 'memfs'
import { Volume }             from 'memfs'
import { base }               from '@atls/code-typescript'

export const compiler = (fixture): Promise<Stats> => {
  const config = new Config()

  config.entry('index').add(path.join(__dirname, fixture))

  config.output.path(path.resolve(__dirname)).filename('bundle.js')

  config.module
    .rule('ts')
    .test(/.tsx?$/)
    .use('ts')
    .loader(require.resolve('ts-loader'))
    .options({
      transpileOnly: true,
      experimentalWatchApi: true,
      compilerOptions: base.compilerOptions,
      configFile: path.join(__dirname, './tsconfig.json'),
    })

  config.module
    .rule('protos')
    .test(/\.proto$/)
    .use('proto')
    .loader(require.resolve('../../src'))

  const compiler = webpack(config.toConfig())

  // @ts-ignore
  compiler.outputFileSystem = createFsFromVolume(new Volume())
  compiler.outputFileSystem.join = path.join.bind(path)

  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) reject(err)
      if (stats && stats.hasErrors()) reject(stats.toJson().errors)

      resolve(stats!)
    })
  })
}
