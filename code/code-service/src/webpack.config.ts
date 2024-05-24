import { writeFileSync }                 from 'node:fs'
import { readFile }                      from 'node:fs/promises'
import { join }                          from 'node:path'

import Config                            from 'webpack-chain'
import fg                                from 'fast-glob'
import { findUp }                        from 'find-up'
import { temporaryFile }                 from 'tempy'

import tsconfig                          from '@atls/config-typescript'
import { webpack }                       from '@atls/code-runtime/webpack'
import { tsLoaderPath }                  from '@atls/code-runtime/webpack'
import { webpackProtoImportsLoaderPath } from '@atls/code-runtime/webpack'

import { FORCE_UNPLUGGED_PACKAGES }      from './webpack.externals.js'
import { UNUSED_EXTERNALS }              from './webpack.externals.js'

export type WebpackEnvironment = 'production' | 'development'

export class WebpackConfig {
  constructor(private readonly cwd: string) {}

  async build(
    environment: WebpackEnvironment = 'production',
    plugins: Array<any> = []
  ): Promise<webpack.Configuration> {
    const config = new Config()

    this.applyCommon(config, environment)
    this.applyPlugins(config, environment)
    this.applyModules(config)

    config.externals(await this.getExternals())

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
      config.plugin('hot').use(webpack.HotModuleReplacementPlugin)
    })
  }

  private applyModules(config: Config) {
    const configFile = temporaryFile()

    writeFileSync(configFile, '{"include":["**/*"]}')

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
      .rule('protos')
      .test(/\.proto$/)
      .use('proto')
      .loader(webpackProtoImportsLoaderPath)
  }

  async getUnpluggedDependencies(): Promise<Set<string>> {
    const yarnFolder = await findUp('.yarn')

    if (!yarnFolder) {
      return Promise.resolve(new Set())
    }

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

  async getWorkspaceExternals(): Promise<Set<string>> {
    try {
      const content = await readFile(join(this.cwd, 'package.json'), 'utf-8')

      const { externalDependencies = {} } = JSON.parse(content)

      return new Set(Object.keys(externalDependencies))
    } catch {
      return Promise.resolve(new Set())
    }
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
}
