import { writeFile }      from 'node:fs/promises'
import { readFile }       from 'node:fs/promises'
import { readFileSync }   from 'node:fs'
import { relative }       from 'node:path'
import { join }           from 'node:path'

import * as babel         from 'prettier/plugins/babel'
import * as graphql       from 'prettier/plugins/graphql'
import * as markdown      from 'prettier/plugins/markdown'
import * as typescript    from 'prettier/plugins/typescript'
import * as yaml          from 'prettier/plugins/yaml'
// @ts-expect-error
import * as estree        from 'prettier/plugins/estree'
import { globby }         from 'globby'
import { format }         from 'prettier/standalone'
import ignorer            from 'ignore'

import config             from '@atls/config-prettier'
import plugin             from '@atls/prettier-plugin'

import { ignore }         from './formatter.patterns.js'
import { createPatterns } from './formatter.patterns.js'

export class Formatter {
  constructor(private readonly cwd: string) {}

  async formatFiles(files: Array<string> = []): Promise<void> {
    const formatFiles = ignorer
      .default()
      .add(ignore)
      .add(await this.getProjectIgnorePatterns())
      .filter(files.map((filepath) => relative(this.cwd, filepath)))

    for (const filename of formatFiles) {
      // eslint-disable-next-line no-await-in-loop
      const input = await readFile(filename, 'utf8')

      // eslint-disable-next-line no-await-in-loop
      const output = await format(input, {
        ...config,
        filepath: filename,
        plugins: [estree, yaml, markdown, graphql, babel, typescript, plugin],
      })

      if (output !== input && output) {
        // eslint-disable-next-line no-await-in-loop
        await writeFile(filename, output, 'utf8')
      }
    }
  }

  async format(files?: Array<string>): Promise<void> {
    if (files && files.length > 0) {
      await this.formatFiles(files)
    } else {
      await this.formatProject()
    }
  }

  async formatProject(): Promise<void> {
    const files = await globby(createPatterns(this.cwd), {
      dot: true,
    })

    await this.formatFiles(files)
  }

  private async getProjectIgnorePatterns(): Promise<Array<string>> {
    const content = await readFile(join(this.cwd, 'package.json'), 'utf-8')

    const { formatterIgnorePatterns = [] }: { formatterIgnorePatterns: Array<string> } =
      JSON.parse(content)

    return formatterIgnorePatterns
  }
}
