import type { webpack } from '@atls/code-runtime/webpack'

import { writeFile }    from 'node:fs/promises'
import { mkdtemp }      from 'node:fs/promises'
import { join }         from 'node:path'
import { tmpdir }       from 'node:os'

import Config           from 'webpack-chain-5'

import { tsLoaderPath } from '@atls/code-runtime/webpack'
import tsconfig         from '@atls/config-typescript'

export class WebpackConfig {
  constructor(
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
      .set('.cjs', ['.cjs', '.cts'])
      .set('.mjs', ['.mjs', '.mts'])

    config.externalsType('import')
    config.externalsPresets({ node: true })

    config.experiments({ outputModule: true })
  }

  private async applyModules(config: Config): Promise<void> {
    const configFile = join(await mkdtemp(join(tmpdir(), 'tools-icons-')), 'tsconfig.json')

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
  }
}
