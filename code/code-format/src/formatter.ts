import * as babel         from 'prettier/plugins/babel'
import * as estree        from 'prettier/plugins/estree'
import * as graphql       from 'prettier/plugins/graphql'
import * as markdown      from 'prettier/plugins/markdown'
import * as typescript    from 'prettier/plugins/typescript'
import * as yaml          from 'prettier/plugins/yaml'

import * as plugin        from '@atls/prettier-plugin'

import { readFileSync }   from 'node:fs'
import { writeFileSync }  from 'node:fs'
import { join }           from 'node:path'
import { relative }       from 'node:path'

import globby             from 'globby'
import ignorer            from 'ignore'
import { format }         from 'prettier/standalone'

/* eslint-disable no-await-in-loop */
import prettierConfig     from '@atls/config-prettier'

import { ignore }         from './formatter.patterns'
import { createPatterns } from './formatter.patterns'

export class Formatter {
  constructor(private readonly cwd: string) {}

  async formatFiles(files: Array<string> = []) {
    const formatFiles = ignorer()
      .add(ignore)
      .add(await this.getProjectIgnorePatterns())
      .filter(files.map((filepath) => relative(this.cwd, filepath)))

    for (const filename of formatFiles) {
      const input = readFileSync(filename, 'utf8')
      const output = await format(input, {
        ...prettierConfig,
        filepath: filename,
        plugins: [estree, yaml, markdown, graphql, babel, typescript, plugin],
      })

      if (output !== input && output) writeFileSync(filename, output, 'utf8')
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

  private async getProjectIgnorePatterns(): Promise<Array<string>> {
    const content = readFileSync(join(this.cwd, 'package.json'), 'utf-8')

    const { formatterIgnorePatterns = [] }: { formatterIgnorePatterns: string[] } =
      JSON.parse(content)

    return formatterIgnorePatterns
  }
}
