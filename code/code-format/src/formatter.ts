import { writeFile }      from 'node:fs/promises'
import { readFile }       from 'node:fs/promises'
import { relative }       from 'node:path'

import ignorerPkg         from 'ignore'
import babel              from 'prettier/plugins/babel'
import graphql            from 'prettier/plugins/graphql'
import markdown           from 'prettier/plugins/markdown'
import typescript         from 'prettier/plugins/typescript'
import yaml               from 'prettier/plugins/yaml'
import { globby }         from 'globby'
import { format }         from 'prettier/standalone'

import config             from '@atls/config-prettier'
import plugin             from '@atls/prettier-plugin'

import { ignore }         from './formatter.patterns.js'
import { createPatterns } from './formatter.patterns.js'

// TODO: moduleResolution
const ignorer = ignorerPkg as any

export class Formatter {
  constructor(private readonly cwd: string) {}

  async formatFiles(files: Array<string> = []) {
    const formatFiles = ignorer()
      .add(ignore)
      .filter(files.map((filepath) => relative(this.cwd, filepath)))

    for (const filename of formatFiles) {
      // eslint-disable-next-line no-await-in-loop
      const input = await readFile(filename, 'utf8')

      // eslint-disable-next-line no-await-in-loop
      const output = await format(input, {
        ...config,
        filepath: filename,
        plugins: [
          yaml as any,
          markdown as any,
          graphql as any,
          babel as any,
          typescript as any,
          plugin as any,
        ],
      })

      if (output !== input && output) {
        // eslint-disable-next-line no-await-in-loop
        await writeFile(filename, output, 'utf8')
      }
    }
  }

  async format(files?: Array<string>) {
    if (files && files.length > 0) {
      await this.formatFiles(files)
    } else {
      await this.formatProject()
    }
  }

  async formatProject() {
    const files = await globby(createPatterns(this.cwd), {
      dot: true,
    })

    await this.formatFiles(files)
  }
}
