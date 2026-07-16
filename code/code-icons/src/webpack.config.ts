import type { webpack }                 from '@atls/raijin/webpack'

import type { TypeScriptConfigRuntime } from './webpack.interfaces.js'

import { join }                         from 'node:path'

import Config                           from 'webpack-chain-5'

import { resolveRaijinRuntimeUrl }      from '@atls/raijin/runtime-resolver'

const TYPESCRIPT_CONFIG_SPECIFIER = '@atls/raijin/config/typescript'

const importTypeScriptConfigRuntime = async (cwd: string): Promise<TypeScriptConfigRuntime> =>
  (await import(
    resolveRaijinRuntimeUrl(cwd, TYPESCRIPT_CONFIG_SPECIFIER)
  )) as TypeScriptConfigRuntime

export class WebpackConfig {
  constructor(
    private readonly loaders: {
      tsLoader: string
    },
    private readonly cwd: string,
    private readonly target: string
  ) {}

  async build(): Promise<webpack.Configuration> {
    const config = new Config()

    await this.applyCommon(config)
    await this.applyModules(config)

    return config.toConfig()
  }

  private async applyCommon(config: Config): Promise<void> {
    config.mode('development').bail(false).target('async-node').optimization.minimize(false)

    config.entry('replacements').add(join(this.cwd, 'replacements'))
    config.entry('template').add(join(this.cwd, 'template'))

    config.output.path(this.target).filename('[name].mjs')
    config.output.library({ type: 'module' })
    config.output.chunkFormat('module')
    config.output.module(true)

    config.resolve.extensions.add('.tsx').add('.ts').add('.js')
    config.resolve.extensionAlias
      .set('.js', ['.js', '.ts'])
      .set('.jsx', ['.jsx', '.tsx'])
      .set('.mjs', ['.mjs', '.mts'])

    config.externalsType('import')
    config.externalsPresets({ node: true })

    config.experiments({ outputModule: true })
  }

  private async applyModules(config: Config): Promise<void> {
    const { materializeTypeScriptConfig, typescriptDefaults: tsconfig } =
      await importTypeScriptConfigRuntime(this.cwd)
    const configFile = await materializeTypeScriptConfig({
      config: { include: ['**/*'] },
      prefix: 'tools-icons-',
    })

    config.module
      .rule('ts')
      .test(/.tsx?$/)
      .use('ts')
      .loader(this.loaders.tsLoader)
      .options({
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
      })
  }
}
