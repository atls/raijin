import type { materializeTypeScriptConfig as MaterializeTypeScriptConfig } from '@atls/raijin/config/typescript'
import type { typescriptDefaults as TypeScriptDefaults } from '@atls/raijin/config/typescript'
import type { webpack as wp }                            from '@atls/raijin/webpack'

import type { WebpackEnvironment }                       from './interfaces.js'

import { readFile }                                      from 'node:fs/promises'
import { rm }                                            from 'node:fs/promises'
import { dirname }                                       from 'node:path'
import { join }                                          from 'node:path'

import { resolveRaijinRuntimeUrl }                       from '@atls/raijin/runtime-resolver'

import { WebpackExternals }                              from './externals.js'
import { createOptionalImportIgnorePlugin }              from './optional-imports.js'

export interface CompilationConfiguration {
  configuration: wp.Configuration
  dispose: () => Promise<void>
}

const TYPESCRIPT_CONFIG_SPECIFIER = '@atls/raijin/config/typescript'

type TypeScriptConfigRuntime = {
  materializeTypeScriptConfig: typeof MaterializeTypeScriptConfig
  typescriptDefaults: typeof TypeScriptDefaults
}

const loadTypeScriptConfigRuntime = async (cwd: string): Promise<TypeScriptConfigRuntime> =>
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
    private readonly outputPath: string,
    workspaceDependencies: Iterable<string> = []
  ) {
    this.workspaceDependencies = new Set(workspaceDependencies)
  }

  async build(
    environment: WebpackEnvironment = 'production',
    additionalPlugins: Array<wp.WebpackPluginInstance> = []
  ): Promise<CompilationConfiguration> {
    await this.assertEsmWorkspace()

    const { materializeTypeScriptConfig, typescriptDefaults: tsconfig } =
      await loadTypeScriptConfigRuntime(this.cwd)
    const configFile = await materializeTypeScriptConfig({
      config: { include: ['**/*'] },
      prefix: 'code-service-',
    })

    const webpackExternals = new WebpackExternals(this.cwd, this.workspaceDependencies)
    const externals = [await webpackExternals.build()]

    const plugins = this.createPlugins(environment, additionalPlugins, true)

    const configuration: wp.Configuration = {
      mode: environment,
      bail: environment === 'production',
      target: 'node',
      optimization: { emitOnErrors: false, minimize: false },
      experiments: {
        outputModule: true,
      },
      plugins,
      entry: {
        index: join(this.cwd, 'src/index'),
      },
      node: { __dirname: true, __filename: false },
      output: {
        path: this.outputPath,
        filename: '[name].js',
        library: { type: 'module' },
        // Webpack HMR still cannot emit module-format hot-update chunks.
        chunkFormat: environment === 'development' ? 'commonjs' : 'module',
        module: true,
        clean: environment === 'production',
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

    return {
      configuration,
      dispose: async () => {
        await rm(dirname(configFile), { recursive: true, force: true })
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

    return plugins
  }
}
