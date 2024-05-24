import type { WebpackEnvironment } from './webpack.interfaces.js'

import { writeFile }               from 'node:fs/promises'
import { mkdtemp }                 from 'node:fs/promises'
import { join }                    from 'node:path'
import { tmpdir }                  from 'node:os'

import Config                      from 'webpack-chain-5'

import { webpack }                 from '@atls/code-runtime/webpack'
import { tsLoaderPath }            from '@atls/code-runtime/webpack'
import { nodeLoaderPath }          from '@atls/code-runtime/webpack'
import tsconfig                    from '@atls/config-typescript'

import { WebpackExternals }        from './webpack.externals.js'
import { LAZY_IMPORTS }            from './webpack.ignore.js'

export class WebpackConfig {
  constructor(private readonly cwd: string) {}

  async build(
    environment: WebpackEnvironment = 'production',
    plugins: Array<{
      use: Config.PluginClass<webpack.WebpackPluginInstance> | webpack.WebpackPluginInstance
      args: Array<any>
      name: string
    }> = []
  ): Promise<webpack.Configuration> {
    const config = new Config()

    await this.applyCommon(config, environment)
    await this.applyPlugins(config, environment)
    await this.applyModules(config)

    plugins.forEach((plugin) => {
      config.plugin(plugin.name).use(plugin.use, plugin.args)
    })

    return config.toConfig()
  }

  private async applyCommon(config: Config, environment: WebpackEnvironment): Promise<void> {
    config
      .mode(environment)
      .bail(environment === 'production')
      .target('async-node')
      .optimization.minimize(false)

    config.entry('index').add(join(this.cwd, 'src/index'))

    if (environment === 'development') {
      config.entry('hot').add('webpack/hot/poll?100')
    }

    config.output.path(join(this.cwd, 'dist')).filename('[name].js')
    config.output.chunkFormat('module')
    config.output.module(true)

    config.resolve.extensions.add('.tsx').add('.ts').add('.js')
    config.resolve.extensionAlias
      .set('.js', ['.js', '.ts'])
      .set('.jsx', ['.jsx', '.tsx'])
      .set('.cjs', ['.cjs', '.cts'])
      .set('.mjs', ['.mjs', '.mts'])

    config.resolve.alias.set('class-transformer/storage', 'class-transformer/cjs/storage')

    config.externalsType('import')
    config.externalsPresets({ node: true })
    config.externals(['webpack/hot/poll?100', await new WebpackExternals(this.cwd).build()])

    config.devtool(environment === 'production' ? 'source-map' : 'eval-cheap-module-source-map')

    config.experiments({ outputModule: true })
  }

  private async applyPlugins(config: Config, environment: WebpackEnvironment): Promise<void> {
    if (environment === 'development') {
      config.plugin('hot').use(webpack.HotModuleReplacementPlugin)
    }

    config.plugin('ignore').use(webpack.IgnorePlugin, [
      {
        checkResource: (resource: string): boolean => {
          if (!LAZY_IMPORTS.includes(resource)) {
            return false
          }

          try {
            require.resolve(resource, {
              paths: [this.cwd],
            })
          } catch (err) {
            return true
          }

          return false
        },
      },
    ])
  }

  private async applyModules(config: Config): Promise<void> {
    const configFile = join(await mkdtemp(join(tmpdir(), 'code-service-')), 'tsconfig.json')

    await writeFile(configFile, '{"include":["**/*"]}')

    config.module
      .rule('ts')
      .test(/.tsx?$/)
      .use('ts')
      .loader(tsLoaderPath)
      .options({
        transpileOnly: true,
        experimentalWatchApi: true,
        onlyCompileBundledFiles: true,
        compilerOptions: { ...tsconfig.compilerOptions, sourceMap: true },
        context: this.cwd,
        configFile,
      })

    config.module
      .rule('node')
      .test(/\.node$/)
      .use('node')
      .loader(nodeLoaderPath)
  }
}
