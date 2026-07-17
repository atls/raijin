import type { Config }                from '@atls/raijin/svgr'
import type { PortablePath }          from '@yarnpkg/fslib'
import type { webpack as wp }         from '@atls/raijin/webpack'

import type { Loaders }               from './compiler.interfaces.js'
import type { CompiledConfiguration } from './generator.interfaces.js'
import type { Output }                from './generator.interfaces.js'
import type { Source }                from './generator.interfaces.js'
import type { SvgrRuntime }           from './generator.interfaces.js'
import type { WebpackRuntime }        from './generator.interfaces.js'

import EventEmitter                   from 'node:events'
import { access }                     from 'node:fs/promises'
import { mkdir }                      from 'node:fs/promises'
import { mkdtemp }                    from 'node:fs/promises'
import { readFile }                   from 'node:fs/promises'
import { readdir }                    from 'node:fs/promises'
import { writeFile }                  from 'node:fs/promises'
import { tmpdir }                     from 'node:os'
import { basename }                   from 'node:path'
import { extname }                    from 'node:path'
import { join }                       from 'node:path'

import { npath }                      from '@yarnpkg/fslib'
import camelcase                      from 'camelcase'

import { Compiler }                   from './compiler.js'

export class Generator extends EventEmitter {
  protected constructor(
    private readonly svgr: SvgrRuntime,
    private readonly webpack: typeof wp,
    private readonly loaders: Loaders,
    private readonly cwd: string
  ) {
    super()
  }

  static async initialize(cwd: PortablePath): Promise<Generator> {
    const { transform, jsx } = (await import('@atls/raijin/svgr')) as SvgrRuntime
    const { webpack, tsLoaderPath } = (await import('@atls/raijin/webpack')) as WebpackRuntime

    return new Generator(
      { transform, jsx },
      webpack,
      { tsLoader: tsLoaderPath },
      npath.fromPortablePath(cwd)
    )
  }

  async generate(config: Partial<Config> = {}): Promise<Array<string>> {
    return this.save(await this.transform(await this.read(join(this.cwd, 'icons')), config))
  }

  protected async compileReplacementsAndTemplate(): Promise<CompiledConfiguration> {
    const target = await mkdtemp(join(tmpdir(), 'raijin-icons-'))
    const compiler = this.webpack(await new Compiler(this.loaders, this.cwd, target).build())

    await new Promise((resolve, reject) => {
      compiler.run((error) => {
        if (error) {
          reject(error)

          return
        }

        resolve(undefined)
      })
    })

    return {
      replacements: (await import(join(target, 'replacements.mjs'))).default,
      template: (await import(join(target, 'template.mjs'))).default,
    }
  }

  protected async read(iconsPath: string): Promise<Array<Source>> {
    this.emit('read:start')

    const files = (await readdir(iconsPath)).sort()
    const source = await Promise.all(
      files
        .filter((file) => file.endsWith('.svg'))
        .map(async (file) => ({
          source: await readFile(join(iconsPath, file), 'utf8'),
          component: camelcase(basename(file, extname(file)), { pascalCase: true }),
          name: basename(file, extname(file)),
          path: join(iconsPath, file),
        }))
    )

    this.emit('read:end')

    return source
  }

  protected async transform(icons: Array<Source>, config: Partial<Config>): Promise<Array<Output>> {
    this.emit('transform:start')

    const { replacements, template } = await this.compileReplacementsAndTemplate()
    const outputs = await Promise.all(
      icons.map(async (icon) => ({
        ...icon,
        output: await this.svgr.transform(
          icon.source,
          {
            ...config,
            icon: true,
            template,
            typescript: true,
            expandProps: true,
            replaceAttrValues: replacements[`${icon.component}Icon`] ?? {},
          },
          {
            componentName: `${icon.component}Icon`,
            caller: {
              name: '@atls/raijin',
              defaultPlugins: [this.svgr.jsx as any], // eslint-disable-line @typescript-eslint/no-explicit-any
            },
          }
        ),
      }))
    )

    this.emit('transform:end')

    return outputs
  }

  protected async save(icons: Array<Output>): Promise<Array<string>> {
    this.emit('save:start')

    const target = join(this.cwd, 'src')

    try {
      await access(target)
    } catch {
      await mkdir(target, { recursive: true })
    }

    const componentFiles = icons.map((icon) => `${icon.name}.icon.tsx`)

    await Promise.all(
      icons.map(async (icon, index) => writeFile(join(target, componentFiles[index]), icon.output))
    )
    await writeFile(
      join(target, 'index.ts'),
      icons.map((icon) => `export * from './${icon.name}.icon.jsx'`).join('\n')
    )

    this.emit('save:end')

    return [...componentFiles, 'index.ts']
  }
}
