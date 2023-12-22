import { tsConfig } from '@atls/config-typescript-new'

import fg                             from 'fast-glob'
import findUp                         from 'find-up'
import { readFile }                   from 'node:fs/promises'
import { join }                       from 'node:path'
import { Configuration }              from 'webpack'
import { WebpackPluginInstance }      from 'webpack'
import { HotModuleReplacementPlugin } from 'webpack'

import { FORCE_UNPLUGGED_PACKAGES } from './webpack.externals'
import { UNUSED_EXTERNALS }         from './webpack.externals'
import { WebpackEnvironment }       from './webpack.interfaces'

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
          } catch {
          } // eslint-disable-line
        }),
    )

    return dependenciesNames
  }


  async getExternals(): Promise<{ [key: string]: string }> {
    const workspaceExternals: Array<string> = Array.from(await this.getWorkspaceExternals())

    const unpluggedExternals: Array<string> = Array.from(await this.getUnpluggedDependencies())

    return Array.from(
      new Set([...workspaceExternals, ...unpluggedExternals, ...UNUSED_EXTERNALS]),
    ).reduce(
      (result, dependency) => ({
        ...result,
        [dependency]: `commonjs2 ${dependency}`,
      }),
      {},
    )
  }

  async build(
    environment: WebpackEnvironment = WebpackEnvironment.prod,
    plugins: WebpackPluginInstance[] = [],
  ): Promise<Configuration> {
    return ({
      mode: environment,
      bail: environment === WebpackEnvironment.prod,
      externals: await this.getExternals(),
      target: 'async-node',
      optimization: { minimize: false },
      plugins: [environment === WebpackEnvironment.dev ? new HotModuleReplacementPlugin() : () => {}, ...plugins],
      entry: join(this.cwd, 'src/index'),
      node: { __dirname: false, __filename: false },
      output: { path: join(this.cwd, 'dist'), filename: '[name].js' },
      resolve: { extensions: ['.tsx', '.ts', '.js'] },
      devtool: environment === WebpackEnvironment.prod ? 'source-map' : 'eval-cheap-module-source-map',
      module: {
        rules: [
          {
            test: /.tsx?$/, use: {
              loader: require.resolve('ts-loader'), options: {
                transpileOnly: true,
                experimentalWatchApi: true,
                onlyCompileBundledFiles: true,
                compilerOptions: { ...tsConfig.compilerOptions, sourceMap: true },
              },
            },
          },
          { test: /\.proto$/, use: require.resolve('@atls/webpack-proto-imports-loader-new') },
          {
            test: /\.css$/i, use: [require.resolve('style-loader'), require.resolve('css-loader')],
          },
          { test: /\.(woff|woff2|eot|ttf|otf)$/i, type: 'asset/resource' },
          { test: /\.(png|svg|jpg|jpeg|gif)$/i, type: 'asset/resource' },
          { test: /\.ya?ml$/, use: require.resolve('yaml-loader') },
        ],
      },
    })
  }
}
