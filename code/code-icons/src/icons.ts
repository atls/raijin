import type { Config }                     from '@atls/code-runtime/svgr'
import type { transform as svgrTransform }   from '@atls/code-runtime/svgr'
import type { jsx as svgrJsx }   from '@atls/code-runtime/svgr'
import type { webpack as wp }   from '@atls/code-runtime/webpack'

import EventEmitter from 'node:events'
import { access }        from 'node:fs/promises'
import { mkdtemp }       from 'node:fs/promises'
import { readFile }      from 'node:fs/promises'
import { readdir }       from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { mkdir }         from 'node:fs/promises'
import { tmpdir }        from 'node:os'
import { join }          from 'node:path'
import { basename }      from 'node:path'
import { extname }       from 'node:path'

import camelcase         from 'camelcase'

import { WebpackConfig }                   from './webpack.config.js'

interface IconSource {
  source: string
  path: string
  name: string
  component: string
}

interface IconOutput extends IconSource {
  output: string
}

export class Icons extends EventEmitter {
  protected constructor(
    private readonly svgr: { transform: typeof svgrTransform; jsx: typeof svgrJsx },
    private readonly webpack: typeof wp,
    private readonly loaders: { tsLoader: string },
    private readonly cwd: string
  ) {
    super()
  }

  static async initialize(cwd: string): Promise<Icons> {
    const { transform, jsx } = await import('@atls/code-runtime/svgr')
    const { webpack, tsLoaderPath } = await import('@atls/code-runtime/webpack')

    return new Icons(
      { transform, jsx },
      webpack,
      {
        tsLoader: tsLoaderPath,
      },
      cwd
    )
  }

  async generate(config: Partial<Config> = {}): Promise<void> {
    await this.save(await this.transform(await this.read(join(this.cwd, 'icons')), config))
  }

  protected async compileReplacementsAndTemplate(): Promise<{
    replacements: Record<string, Record<string, any>>
    template: Config['template']
  }> {
    const target = await mkdtemp(join(tmpdir(), 'tools-icons-'))

    const compiler = this.webpack(await new WebpackConfig(this.loaders, this.cwd, target).build())

    await new Promise((resolve, reject) => {
      compiler.run((error) => {
        if (error) {
          reject(error)
        }

        resolve([])
      })
    })

    return {
      replacements: (await import(join(target, 'replacements.mjs'))).default,
      template: (await import(join(target, 'template.mjs'))).default,
    }
  }

  protected async read(iconspath: string): Promise<Array<IconSource>> {
    this.emit('read:start')

    const files = await readdir(iconspath)

    const source = await Promise.all(
      files
        .filter((file) => file.endsWith('.svg'))
        .map(async (file) => ({
          source: await readFile(join(iconspath, file), 'utf8'),
          component: camelcase(basename(file, extname(file)), { pascalCase: true }),
          name: basename(file, extname(file)),
          path: join(iconspath, file),
          file,
        }))
    )

    this.emit('read:end')

    return source
  }

  protected async transform(
    icons: Array<IconSource>,
    config: Partial<Config>
  ): Promise<Array<IconOutput>> {
    this.emit('transform:start')

    const { replacements, template } = await this.compileReplacementsAndTemplate()

    const outputs = await Promise.all(
      icons.map(async (icon) => {
        const output: string = await this.svgr.transform(
          icon.source,
          {
            ...config,
            icon: true,
            template,
            typescript: true,
            expandProps: true,
            replaceAttrValues: replacements[`${icon.component}Icon`] || {},
          },
          {
            componentName: `${icon.component}Icon`,
            caller: {
              name: '@atls/code-icons',
              defaultPlugins: [this.svgr.jsx as any],
            },
          }
        )

        return {
          ...icon,
          output,
        }
      })
    )

    this.emit('transform:end')

    return outputs
  }

  protected async save(icons: Array<IconOutput>): Promise<void> {
    this.emit('save:start')

    const target = join(this.cwd, 'src')

    try {
      await access(target)
    } catch {
      await mkdir(target, { recursive: true })
    }

    await Promise.all(
      icons.map(async (icon) => writeFile(join(target, `${icon.name}.icon.tsx`), icon.output))
    )

    await writeFile(
      join(target, 'index.ts'),
      icons.map((icon) => `export * from './${icon.name}.icon.jsx'`).join('\n')
    )

    this.emit('save:end')
  }
}
