/* eslint-disable @typescript-eslint/no-empty-function */
import { readFile }                   from 'node:fs/promises'
import { join }                       from 'node:path'

import fg                             from 'fast-glob'
import findUp                         from 'find-up'
import { Configuration }              from 'webpack'
import { WebpackPluginInstance }      from 'webpack'
import { HotModuleReplacementPlugin } from 'webpack'

import { FORCE_UNPLUGGED_PACKAGES }   from './webpack.externals'
import { UNUSED_EXTERNALS }           from './webpack.externals'
import { ModuleTypes }                from './webpack.interfaces'
import { WebpackEnvironment }         from './webpack.interfaces'

export class WebpackConfig {
  constructor(private readonly cwd: string) {}

  async getWorkspaceExternals(): Promise<Set<string>> {
    try {
      const content = await readFile(join(this.cwd, 'package.json'), 'utf-8')

      const { externalDependencies = {} } = JSON.parse(content)

      return new Set(Object.keys(externalDependencies))
    } catch {
      return Promise.resolve(new Set())
    }
  }

  async getWorkspaceType(): Promise<ModuleTypes> {
    try {
      const content = await readFile(join(this.cwd, 'package.json'), 'utf-8')
      const { type = 'commonjs' } = JSON.parse(content)

      return type
    } catch {
      return 'module'
    }
  }

  async getUnpluggedDependencies(): Promise<Set<string>> {
    const yarnFolder = await findUp('.yarn')

    if (!yarnFolder) return Promise.resolve(new Set())

    const pnpUnpluggedFolder = join(yarnFolder, 'unplugged')
    const dependenciesNames = new Set<string>()

    const entries = await fg('*/node_modules/*/package.json', {
      cwd: pnpUnpluggedFolder,
    })

    await Promise.all(
      entries
        .map((entry) => join(pnpUnpluggedFolder, entry))
        .map(async (entry) => {
          try {
            const { name } = JSON.parse((await readFile(entry)).toString())

            if (name && !FORCE_UNPLUGGED_PACKAGES.has(name)) {
              dependenciesNames.add(name)
            }
          } catch {} // eslint-disable-line
        })
    )

    return dependenciesNames
  }

  async getExternals(): Promise<{ [key: string]: string }> {
    const workspaceExternals: Array<string> = Array.from(await this.getWorkspaceExternals())

    const unpluggedExternals: Array<string> = Array.from(await this.getUnpluggedDependencies())

    return Array.from(
      new Set([...workspaceExternals, ...unpluggedExternals, ...UNUSED_EXTERNALS])
    ).reduce(
      (result, dependency) => ({
        ...result,
        [dependency]: `commonjs2 ${dependency}`,
      }),
      {}
    )
  }

  async build(
    environment: WebpackEnvironment = WebpackEnvironment.prod,
    plugins: WebpackPluginInstance[] = []
  ): Promise<Configuration> {
    return {
      mode: environment,
      bail: environment === WebpackEnvironment.prod,
      externals: await this.getExternals(),
      target: 'async-node',
      optimization: { minimize: false },
      experiments: {
        outputModule: (await this.getWorkspaceType()) === 'module',
      },
      plugins: [
        environment === WebpackEnvironment.dev ? new HotModuleReplacementPlugin() : () => {},
        ...plugins,
      ],
      entry: {
        index: join(this.cwd, 'src/index'),
      },
      node: { __dirname: false, __filename: false },
      output: {
        path: join(this.cwd, 'dist'),
        filename: '[name].js',
        library: { type: await this.getWorkspaceType() },
        chunkFormat: await this.getWorkspaceType(),
      },
      resolve: {
        extensionAlias: { '.js': ['.tsx', '.ts', '.js'], '.jsx': ['.tsx', '.ts', '.js'] },
        extensions: ['.tsx', '.ts', '.js'],
      },
      devtool:
        environment === WebpackEnvironment.prod ? 'source-map' : 'eval-cheap-module-source-map',
      module: {
        rules: [
          {
            loader: require.resolve('swc-loader'),
            options: {
              minify: false,
              jsc: {
                parser: {
                  syntax: 'typescript',
                  jsx: true,
                  dynamicImport: true,
                  privateMethod: true,
                  functionBind: true,
                  exportDefaultFrom: true,
                  exportNamespaceFrom: true,
                  decorators: true,
                  decoratorsBeforeExport: true,
                  topLevelAwait: true,
                  importMeta: true,
                },
                transform: {
                  legacyDecorator: true,
                  decoratorMetadata: true,
                },
              },
            },
          },
          { test: /\.proto$/, use: require.resolve('@atls/webpack-proto-imports-loader') },
          {
            test: /\.css$/i,
            use: [require.resolve('style-loader'), require.resolve('css-loader')],
          },
          { test: /\.(woff|woff2|eot|ttf|otf)$/i, type: 'asset/resource' },
          { test: /\.(png|svg|jpg|jpeg|gif)$/i, type: 'asset/resource' },
          { test: /\.ya?ml$/, use: require.resolve('yaml-loader') },
        ],
      },
    }
  }
}
