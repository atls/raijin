import type { Config }   from '@atls/code-runtime/svgr'

import { access }        from 'node:fs/promises'
import { mkdtemp }       from 'node:fs/promises'
import { readFile }      from 'node:fs/promises'
import { readdir }       from 'node:fs/promises'
import { writeFile }     from 'node:fs/promises'
import { mkdir }         from 'node:fs/promises'
import { join }          from 'node:path'
import { tmpdir }        from 'node:os'
import { basename }      from 'node:path'
import { extname }       from 'node:path'

import camelcase         from 'camelcase'

import { transform }     from '@atls/code-runtime/svgr'
import { jsx }           from '@atls/code-runtime/svgr'
import { webpack }       from '@atls/code-runtime/webpack'

import { WebpackConfig } from './webpack.config.js'

interface IconSource {
  source: string
  path: string
  name: string
  component: string
}

interface IconOutput extends IconSource {
  output: string
}

export class Icons {
  constructor(private readonly cwd: string) {}

  async generate(): Promise<void> {
    await this.save(await this.transform(await this.read(join(this.cwd, 'icons'))))
  }

  protected async compileReplacementsAndTemplate(): Promise<{
    replacements: Record<string, Record<string, any>>
    template: Config['template']
  }> {
    const target = await mkdtemp(join(tmpdir(), 'tools-icons-'))

    const compiler = webpack(await new WebpackConfig(this.cwd, target).build())

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
    const files = await readdir(iconspath)

    return Promise.all(
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
  }

  protected async transform(icons: Array<IconSource>): Promise<Array<IconOutput>> {
    const { replacements, template } = await this.compileReplacementsAndTemplate()

    return Promise.all(
      icons.map(async (icon) => {
        const output: string = await transform(
          icon.source,
          {
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
              defaultPlugins: [jsx as any],
            },
          }
        )

        return {
          ...icon,
          output,
        }
      })
    )
  }

  protected async save(icons: Array<IconOutput>): Promise<void> {
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
  }
}
