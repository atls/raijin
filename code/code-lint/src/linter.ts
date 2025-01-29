import type { ESLint }             from '@atls/code-runtime/eslint'
import type { Linter as ESLinter } from '@atls/code-runtime/eslint'

import EventEmitter                from 'node:events'
import { readFileSync }            from 'node:fs'
import { readFile }                from 'node:fs/promises'
import { writeFile }               from 'node:fs/promises'
import { relative }                from 'node:path'
import { join }                    from 'node:path'

import { globby }                  from 'globby'
import ignorer                     from 'ignore'

import { ignore }                  from './linter.patterns.js'
import { createPatterns }          from './linter.patterns.js'
import { createLintResult }        from './linter.utils.js'

export interface LintOptions {
  fix?: boolean
  cache?: boolean
}

export class Linter extends EventEmitter {
  private ignore: ignorer.Ignore

  constructor(
    private readonly linter: ESLinter,
    private readonly cacheLinter: ESLint,
    private readonly config: Array<ESLinter.Config>,
    private readonly cwd: string
  ) {
    super()

    this.ignore = ignorer.default().add(ignore).add(this.getProjectIgnorePatterns())
  }

  static async initialize(rootCwd: string, cwd: string): Promise<Linter> {
    const { Linter: LinterConstructor, ESLint } = await import('@atls/code-runtime/eslint')
    const { eslintconfig } = await import('@atls/code-runtime/eslint')

    const linter = new LinterConstructor({ configType: 'flat' })

    const config: Array<ESLinter.Config> = eslintconfig.map((item) => ({
      ...item,
      languageOptions: {
        ...(item.languageOptions || {}),
        parserOptions: {
          ...(item.languageOptions?.parserOptions || {}),
          tsconfigRootDir: rootCwd,
        },
      },
    }))

    const eslint = new ESLint({
      cache: true,
      baseConfig: config,
      overrideConfigFile: true,
      cwd,
      cacheLocation: join(rootCwd, '.config/eslint/.eslintcache'),
    })

    return new Linter(linter, eslint, config, cwd)
  }

  async lintFile(filename: string, options?: LintOptions): Promise<ESLint.LintResult> {
    const source = await readFile(filename, 'utf8')

    if (options?.fix) {
      const { messages, fixed, output } = this.linter.verifyAndFix(source, this.config, {
        filename,
      })

      if (fixed) {
        await writeFile(filename, output, 'utf8')
      }

      return createLintResult(filename, output, messages)
    }

    return createLintResult(
      filename,
      source,
      this.linter.verify(source, this.config, {
        filename,
      })
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

      const result = await this.lintFile(file, options)

      results.push(result)

      this.emit('lint:end', { result })
    }

    this.emit('end', { results })

    return results
  }

  async lint(files?: Array<string>, options?: LintOptions): Promise<Array<ESLint.LintResult>> {
    const filesForLint =
      files && files.length > 0 ? files : await globby(createPatterns(this.cwd), { dot: true })

    const finalFiles = filesForLint.filter(
      (file) => this.ignore.filter([relative(this.cwd, file)]).length !== 0
    )

    if (options?.cache) {
      return this.lintWithCache(finalFiles)
    }

    return this.lintFiles(finalFiles, options)
  }

  private async lintWithCache(files: Array<string> = []): Promise<Array<ESLint.LintResult>> {
    this.emit('start', { files })

    const results = await this.cacheLinter?.lintFiles(files)

    for (const result of results) {
      this.emit('lint:end', { result })
    }

    this.emit('end', { results })

    return results
  }

  private getProjectIgnorePatterns(): Array<string> {
    // eslint-disable-next-line n/no-sync
    const content = readFileSync(join(this.cwd, 'package.json'), 'utf-8')

    const { linterIgnorePatterns = [] } = JSON.parse(content)

    return linterIgnorePatterns as Array<string>
  }
}
