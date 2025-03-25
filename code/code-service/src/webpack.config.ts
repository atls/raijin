import type { webpack as wp }      from '@atls/code-runtime/webpack'

import type { WebpackEnvironment } from './webpack.interfaces.js'

import { readFile }                from 'node:fs/promises'
import { writeFile }               from 'node:fs/promises'
import { mkdtemp }                 from 'node:fs/promises'
import { tmpdir }                  from 'node:os'
import { join }                    from 'node:path'

import tsconfig                    from '@atls/config-typescript'

import { WebpackExternals }        from './webpack.externals.js'
import { LAZY_IMPORTS }            from './webpack.ignore.js'

export class WebpackConfig {
  constructor(
    private readonly webpack: typeof wp,
    private readonly loaders: {
      tsLoader: string
      nodeLoader: string
      nullLoader: string
      protoLoader: string
    },
    private readonly cwd: string
  ) {}

  async build(
    environment: WebpackEnvironment = 'production',
    additionalPlugins: Array<wp.WebpackPluginInstance> = []
  ): Promise<wp.Configuration> {
    const configFile = join(await mkdtemp(join(tmpdir(), 'code-service-')), 'tsconfig.json')

    await writeFile(configFile, '{"include":["**/*"]}')

    const type = await this.getWorkspaceType()

    const webpackExternals = new WebpackExternals(this.cwd)
    const externals = ['webpack/hot/poll?100', await webpackExternals.build()]

    const plugins = this.createPlugins(environment, additionalPlugins, type === 'module')

    return {
      mode: environment,
      bail: environment === 'production',
      target: 'node',
      optimization: { minimize: false },
      experiments: {
        outputModule: type === 'module',
      },
      plugins,
      entry: {
        index: join(this.cwd, 'src/index'),
        ...(environment === 'development' && { hot: 'webpack/hot/poll?100' }),
      },
      node: { __dirname: true, __filename: false },
      output: {
        path: join(this.cwd, 'dist'),
        filename: '[name].js',
        library: { type },
        chunkFormat: environment === 'development' ? 'commonjs' : type,
        module: type === 'module',
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
      externalsType:
        environment === 'production' ? (type === 'module' ? 'import' : 'commonjs') : 'commonjs2',
      externalsPresets: {
        node: true,
      },
      devtool: environment === 'production' ? 'source-map' : 'eval-cheap-module-source-map',
      module: {
        rules: [
          {
            test: /\.d\.ts$/,
            use: {
              loader: this.loaders.nullLoader,
            },
          },
          {
            test: /(^.?|\.[^d]|[^.]d|[^.][^d])\.tsx?$/,
            use: {
              loader: this.loaders.tsLoader,
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
          { test: /\.node$/, use: this.loaders.nodeLoader },
        ],
      },
    }
  }

  private async getWorkspaceType(): Promise<string> {
    try {
      const content = await readFile(join(this.cwd, 'package.json'), 'utf-8')
      const { type = 'commonjs' } = JSON.parse(content)

      return type as string
    } catch {
      return 'module'
    }
  }

  private createPlugins(
    environment: string,
    additionalPlugins: Array<wp.WebpackPluginInstance>,
    isEsm: boolean,
  ): Array<wp.WebpackPluginInstance> {
    const plugins: Array<wp.WebpackPluginInstance> = [
      new this.webpack.IgnorePlugin({
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
          } catch {
            return true
          }

          return false
        },
      }),
      ...additionalPlugins,
    ]

    if (isEsm) {
      plugins.push(
        new this.webpack.BannerPlugin({
          banner: `import { createRequire } from 'node:module'\nimport { fileURLToPath } from 'node:url'\nconst require = createRequire(import.meta.url)\nconst __filename = fileURLToPath(import.meta.url)\n`,
          raw: true,
        })
      )
    }

    if (environment === 'development') {
      plugins.push(new this.webpack.HotModuleReplacementPlugin())
    }

    return plugins
  }
}
