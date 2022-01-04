import * as plugin        from '@atls/prettier-plugin'

import { readFile }       from 'node:fs/promises'
import { writeFile }      from 'node:fs/promises'
import { relative }       from 'node:path'

import globby             from 'globby'
import ignorer            from 'ignore'
import babel              from 'prettier/parser-babel'
import graphql            from 'prettier/parser-graphql'
import markdown           from 'prettier/parser-markdown'
import typescript         from 'prettier/parser-typescript'
import yaml               from 'prettier/parser-yaml'
import { format }         from 'prettier/standalone'

import config             from '@atls/config-prettier'

import { ignore }         from './formatter.patterns'
import { createPatterns } from './formatter.patterns'

export class Formatter {
  constructor(private readonly cwd: string) {}

  async formatFiles(files: Array<string> = []) {
    const formatFiles = ignorer()
      .add(ignore)
      .filter(files.map((filepath) => relative(this.cwd, filepath)))

    for (const filename of formatFiles) {
      // eslint-disable-next-line no-await-in-loop
      const input = await readFile(filename, 'utf8')

      const output = format(input, {
        ...config,
        filepath: filename,
        plugins: [yaml, markdown, graphql, babel, typescript, plugin],
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
      onlyFiles: true,
    })

    await this.formatFiles(files)
  }
}
