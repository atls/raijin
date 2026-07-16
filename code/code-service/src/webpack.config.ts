import type { webpack as wp }               from '@atls/raijin/webpack'

import type { TypeScriptConfigRuntime }     from './webpack.interfaces.js'
import type { WebpackEnvironment }          from './webpack.interfaces.js'

import { readFile }                         from 'node:fs/promises'
import { join }                             from 'node:path'

import { resolveRaijinRuntimeUrl }          from '@atls/raijin/runtime-resolver'

import { WebpackExternals }                 from './webpack.externals.js'
import { createOptionalImportIgnorePlugin } from './webpack.ignore.js'

const TYPESCRIPT_CONFIG_SPECIFIER = '@atls/raijin/config/typescript'

const importTypeScriptConfigRuntime = async (cwd: string): Promise<TypeScriptConfigRuntime> =>
  (await import(
    resolveRaijinRuntimeUrl(cwd, TYPESCRIPT_CONFIG_SPECIFIER)
  )) as TypeScriptConfigRuntime

export class WebpackConfig {
  private readonly workspaceDependencies: Set<string>

  constructor(
    private readonly webpack: typeof wp,
    private readonly loaders: {
      tsLoader: string
      nodeLoader: string
      protoLoader: string
    },
    private readonly cwd: string,
    workspaceDependencies: Iterable<string> = []
  ) {
    this.workspaceDependencies = new Set(workspaceDependencies)
  }

  async build(
    environment: WebpackEnvironment = 'production',
    additionalPlugins: Array<wp.WebpackPluginInstance> = []
  ): Promise<wp.Configuration> {
    const { materializeTypeScriptConfig, typescriptDefaults: tsconfig } =
      await importTypeScriptConfigRuntime(this.cwd)
    const configFile = await materializeTypeScriptConfig({
      config: { include: ['**/*'] },
      prefix: 'code-service-',
    })

    await this.assertEsmWorkspace()

    const webpackExternals = new WebpackExternals(this.cwd, this.workspaceDependencies)
    const externals = ['webpack/hot/poll?100', await webpackExternals.build()]

    const plugins = this.createPlugins(environment, additionalPlugins, true)

    return {
      mode: environment,
      bail: environment === 'production',
      target: 'node',
      optimization: { minimize: false },
      experiments: {
        outputModule: true,
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
        library: { type: 'module' },
        // Webpack HMR still cannot emit module-format hot-update chunks.
        chunkFormat: environment === 'development' ? 'commonjs' : 'module',
        module: true,
        clean: false,
        assetModuleFilename: 'assets/[name][ext]',
      },
      resolve: {
        extensionAlias: {
          '.js': ['.js', '.tsx', '.ts'],
          '.jsx': ['.jsx', '.tsx', '.ts'],
          '.mjs': ['.mjs', '.mts'],
        },
        extensions: ['.js', '.tsx', '.ts'],
        alias: {
          'class-transformer/storage': 'class-transformer/cjs/storage',
        },
      },
      externals,
      externalsType: 'import',
      externalsPresets: {
        node: true,
      },
      devtool: environment === 'production' ? 'source-map' : 'eval-cheap-module-source-map',
      module: {
        parser: {
          javascript: {
            importMeta: false,
          },
        },
        rules: [
          {
            test: /(^.?|\.[^d]|[^.]d|[^.][^d])\.tsx?$/,
            use: {
              loader: this.loaders.tsLoader,
              options: {
                transpileOnly: true,
                experimentalWatchApi: true,
                onlyCompileBundledFiles: true,
                compilerOptions: {
                  ...tsconfig.compilerOptions,
                  module: 'ESNext',
                  moduleResolution: 'Bundler',
                  sourceMap: true,
                },
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

  private async assertEsmWorkspace(): Promise<void> {
    try {
      const content = await readFile(join(this.cwd, 'package.json'), 'utf-8')
      const { type } = JSON.parse(content) as { type?: string }

      if (type === 'module') {
        return
      }

      throw new Error(
        `Raijin service build supports only ESM workspaces with package.json type=module`
      )
    } catch {
      throw new Error(
        `Raijin service build supports only ESM workspaces with package.json type=module`
      )
    }
  }

  private createPlugins(
    environment: string,
    additionalPlugins: Array<wp.WebpackPluginInstance>,
    isEsm: boolean
  ): Array<wp.WebpackPluginInstance> {
    const plugins: Array<wp.WebpackPluginInstance> = [
      createOptionalImportIgnorePlugin(environment),
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
