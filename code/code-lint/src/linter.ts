import type { ESLint }        from '@atls/code-runtime/eslint'
import type { Linter as ESLinter }        from '@atls/code-runtime/eslint'

import EventEmitter from 'node:events'
import { readFileSync }           from 'node:fs'
import { readFile }           from 'node:fs/promises'
import { writeFile }          from 'node:fs/promises'
import { relative }           from 'node:path'
import { join }               from 'node:path'

import { globby }             from 'globby'
import ignorer                from 'ignore'

import { eslintconfig }       from '@atls/code-runtime/eslint'

import { ignore }             from './linter.patterns.js'
import { createPatterns }     from './linter.patterns.js'
import { createLintResult }   from './linter.utils.js'

export interface LintOptions {
  fix?: boolean
}

export class Linter extends EventEmitter {
  private ignore: ignorer.Ignore

  #config: Array<ESLinter.FlatConfig>

  constructor(
    private readonly linter: ESLinter,
    private readonly config: Array<ESLinter.Config>,
    private readonly cwd: string,
  ) {
    super()

    this.ignore = ignorer.default().add(ignore).add(this.getProjectIgnorePatterns())
  }

  static async initialize(rootCwd: string, cwd: string): Promise<Linter> {
    const { Linter: LinterConstructor } = await import('@atls/code-runtime/eslint')
    const { eslintconfig } = await import('@atls/code-runtime/eslint')

    const linter = new LinterConstructor({ configType: 'flat' })

    const config = eslintconfig.map((item) => ({
      ...item,
      languageOptions: {
        ...(item.languageOptions || {}),
        parserOptions: {
          ...(item.languageOptions?.parserOptions || {}),
          tsconfigRootDir: rootCwd,
        },
      },
    }))

    return new Linter(linter, config, cwd)
  }

  async lintFile(filename: string, options?: LintOptions): Promise<ESLint.LintResult> {
    const source = await readFile(filename, 'utf8')

    if (options?.fix) {
      const { messages, fixed, output } = this.linter.verifyAndFix(
        source,
        this.config as ESLinter.Config<ESLinter.RulesRecord, ESLinter.RulesRecord>,
        {
          filename,
        }
      )

      if (fixed) {
        await writeFile(filename, output, 'utf8')
      }

      return createLintResult(filename, output, messages)
    }

    return createLintResult(
      filename,
      source,
      this.linter.verify(
        source,
        this.config as ESLinter.Config<ESLinter.RulesRecord, ESLinter.RulesRecord>,
        {
          filename,
        }
      )
    )
  }

  async lintFiles(
    files: Array<string> = [],
    options?: LintOptions
  ): Promise<Array<ESLint.LintResult>> {
    const results: Array<ESLint.LintResult> = []

    this.emit('start', { files })

    for await (const file of files) {
      this.emit('lint:start', { file })

      if (this.ignore.filter([relative(this.cwd, file)]).length !== 0) {
        results.push(await this.lintFile(file, options))
      }

      this.emit('lint:end', { result })
    }

    this.emit('end', { results })

    return results
  }

  async lintProject(options?: LintOptions): Promise<Array<ESLint.LintResult>> {
    return this.lintFiles(await globby(createPatterns(this.cwd), { dot: true }), options)
  }

  async lint(files?: Array<string>, options?: LintOptions): Promise<Array<ESLint.LintResult>> {
    if (files && files.length > 0) {
      return this.lintFiles(files, options)
    }

    return this.lintProject(options)
  }

  private async getProjectIgnorePatterns(): Array<string> {
    const content = readFileSync(join(this.cwd, 'package.json'), 'utf-8')

    const { linterIgnorePatterns = [] } = JSON.parse(content)

    return linterIgnorePatterns
  }
}
