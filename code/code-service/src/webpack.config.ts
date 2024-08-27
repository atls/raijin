import type { WebpackEnvironment } from './webpack.interfaces.js'

import { readFile }                from 'node:fs/promises'
import { writeFile }               from 'node:fs/promises'
import { mkdtemp }                 from 'node:fs/promises'
import { tmpdir }                  from 'node:os'
import { join }                    from 'node:path'

import { webpack }                 from '@atls/code-runtime/webpack'
import { tsLoaderPath }            from '@atls/code-runtime/webpack'
import { nodeLoaderPath }          from '@atls/code-runtime/webpack'
import { nullLoaderPath }          from '@atls/code-runtime/webpack'
import tsconfig                    from '@atls/config-typescript'

import { WebpackExternals }        from './webpack.externals.js'
import { LAZY_IMPORTS }            from './webpack.ignore.js'
import { ModuleTypes }             from './webpack.interfaces.js'

export class WebpackConfig {
  constructor(private readonly cwd: string) {}

  async build(
    environment: WebpackEnvironment = 'production',
    additionalPlugins: Array<{
      use: webpack.WebpackPluginInstance
      args: Array<any>
      name: string
    }> = []
  ): Promise<webpack.Configuration> {
    const configFile = join(await mkdtemp(join(tmpdir(), 'code-service-')), 'tsconfig.json')

    await writeFile(configFile, '{"include":["**/*"]}')

    const type = await this.getWorkspaceType()

    const webpackExternals = new WebpackExternals(this.cwd)
    const externals = ['webpack/hot/poll?100', await webpackExternals.build()]

    const plugins = this.createPlugins(environment, additionalPlugins)

    return {
      mode: environment,
      bail: environment === 'production',
      target: 'async-node',
      optimization: { minimize: false },
      experiments: {
        outputModule: type === 'module',
      },
      plugins,
      entry: {
        index: join(this.cwd, 'src/index'),
        ...(environment === 'development' && { hot: 'webpack/hot/poll?100' }),
      },
      node: { __dirname: false, __filename: false },
      output: {
        path: join(this.cwd, 'dist'),
        filename: '[name].js',
        library: { type },
        chunkFormat: type,
        module: type === 'module',
        publicPath: './',
        clean: false,
        assetModuleFilename: 'assets/[name][ext]',
      },
      resolve: {
        extensionAlias: {
          '.js': ['.tsx', '.ts', '.js'],
          '.jsx': ['.tsx', '.ts', '.js'],
          '.cjs': ['.cjs', '.cts'],
          '.mjs': ['.mjs', '.mts'],
        },
        extensions: ['.tsx', '.ts', '.js'],
        alias: {
          'class-transformer/storage': 'class-transformer/cjs/storage',
        },
      },
      externals,
      externalsType: type === 'module' ? 'import' : 'commonjs',
      externalsPresets: {
        node: true,
      },
      devtool: environment === 'production' ? 'source-map' : 'eval-cheap-module-source-map',
      module: {
        rules: [
          {
            test: /\.d\.ts$/,
            use: {
              loader: nullLoaderPath,
            },
          },
          {
            test: /(^.?|\.[^d]|[^.]d|[^.][^d])\.tsx?$/,
            use: {
              loader: tsLoaderPath,
              options: {
                transpileOnly: true,
                experimentalWatchApi: true,
                onlyCompileBundledFiles: true,
                compilerOptions: { ...tsconfig.compilerOptions, sourceMap: true },
                context: this.cwd,
                configFile,
              },
            },
          },
          { test: /\.(woff|woff2|eot|ttf|otf)$/i, type: 'asset/resource' },
          { test: /\.(png|svg|jpg|jpeg|gif)$/i, type: 'asset/resource' },
          { test: /\.(md)$/i, type: 'asset/resource' },
          { test: /\.node$/, use: nodeLoaderPath },
        ],
      },
    }
  }

  private async getWorkspaceType(): Promise<ModuleTypes> {
    try {
      const content = await readFile(join(this.cwd, 'package.json'), 'utf-8')
      const { type = 'commonjs' } = JSON.parse(content)

      return type
    } catch {
      return 'module'
    }
  }

  private createPlugins(environment: string, additionalPlugins: []) {
    const plugins = [
      new webpack.IgnorePlugin({
        checkResource: (resource: string): boolean => {
          if (resource.endsWith('.js.map')) {
            return true
          }

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
      }),
      ...additionalPlugins,
    ]

    if (environment === 'development') {
      plugins.push(new webpack.HotModuleReplacementPlugin())
    }

    return plugins
  }
}
