import * as plugin        from '@atls/prettier-plugin'
import { readFileSync }   from 'fs'
import { writeFileSync }  from 'node:fs'

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

import { ignore }         from './formatter.patterns.js'
import { createPatterns } from './formatter.patterns.js'

export class Formatter {
  constructor(private readonly cwd: string) {}

  async formatFiles(files: Array<string> = []) {
    const formatFiles = ignorer()
      .add(ignore)
      .filter(files.map((filepath) => relative(this.cwd, filepath)))

    for (const filename of formatFiles) {
      const input = readFileSync(filename, 'utf8')

      const output = await format(input, {
        ...config,
        filepath: filename,
        plugins: [yaml, markdown, graphql, babel, typescript, plugin],
      })

      if (output !== input && output) {
        writeFileSync(filename, output, 'utf8')
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
