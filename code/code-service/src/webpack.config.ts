import { readFile }                           from 'node:fs/promises'
import { join }                               from 'node:path'

import type { PortablePath }                  from '@yarnpkg/fslib'

import { Configuration as YarnConfiguration } from '@yarnpkg/core'
import { Project }                            from '@yarnpkg/core'
import { getPluginConfiguration }             from '@yarnpkg/cli'

import Config                                 from 'webpack-chain'
import fg                                     from 'fast-glob'
import { HotModuleReplacementPlugin }         from 'webpack'
import { Configuration }                      from 'webpack'

import tsconfig                               from '@atls/config-typescript'

import { FORCE_UNPLUGGED_PACKAGES }           from './webpack.externals'
import { UNUSED_EXTERNALS }                   from './webpack.externals'

export type WebpackEnvironment = 'production' | 'development'

export class WebpackConfig {
  constructor(private readonly cwd: string) {}

  async build(
    environment: WebpackEnvironment = 'production',
    plugins: Array<any> = []
  ): Promise<Configuration> {
    const root = process.cwd() as PortablePath
    const configuration = await YarnConfiguration.find(root, getPluginConfiguration())
    const { project } = await Project.find(configuration, root)

    const config = new Config()

    this.applyCommon(config, environment)
    this.applyPlugins(config, environment)
    this.applyModules(config)

    config.externals(await this.getExternals(configuration, project))

    plugins.forEach((plugin) => {
      config.plugin(plugin.name).use(plugin.use, plugin.args)
    })

    return config.toConfig()
  }

  private applyCommon(config: Config, environment: WebpackEnvironment) {
    config
      .mode(environment)
      .bail(environment === 'production')
      .target('async-node')
      .optimization.minimize(false)

    config.node.set('__dirname', false).set('__filename', false)

    config.entry('index').add(join(this.cwd, 'src/index'))

    config.output.path(join(this.cwd, 'dist')).filename('[name].js')

    config.resolve.extensions.add('.tsx').add('.ts').add('.js')

    config.devtool(
      environment === 'production' ? 'source-map' : ('eval-cheap-module-source-map' as any)
    )
  }

  private applyPlugins(config: Config, environment: WebpackEnvironment) {
    config.when(environment === 'development', () => {
      config.plugin('hot').use(HotModuleReplacementPlugin)
    })
  }

  private applyModules(config: Config) {
    config.module
      .rule('ts')
      .test(/.tsx?$/)
      .use('ts')
      .loader(require.resolve('ts-loader'))
      .options({
        transpileOnly: true,
        experimentalWatchApi: true,
        onlyCompileBundledFiles: true,
        compilerOptions: { ...tsconfig.compilerOptions, sourceMap: true },
      })

    config.module
      .rule('protos')
      .test(/\.proto$/)
      .use('proto')
      .loader(require.resolve('@atls/webpack-proto-imports-loader'))
  }

  async getUnpluggedDependencies(configuration: YarnConfiguration): Promise<Set<string>> {
    const pnpUnpluggedFolder = configuration.get('pnpUnpluggedFolder') as string
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

  async getExternals(
    configuration: YarnConfiguration,
    project: Project
  ): Promise<{ [key: string]: string }> {
    const workspace = project.getWorkspaceByFilePath(this.cwd as PortablePath)

    const workspaceExternals: Array<string> = Object.keys(
      workspace?.manifest?.raw?.externalDependencies || {}
    )

    const unpluggedExternals: Array<string> = Array.from(
      await this.getUnpluggedDependencies(configuration)
    )

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
}
