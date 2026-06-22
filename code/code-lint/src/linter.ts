import type { ESLintInstance }          from '@atls/code-runtime/eslint'
import type { ESLint as RuntimeESLint } from '@atls/code-runtime/eslint'
import type { LinterConfig }            from '@atls/code-runtime/eslint'
import type { LinterInstance }          from '@atls/code-runtime/eslint'
import type { Linter as RuntimeLinter } from '@atls/code-runtime/eslint'
import type { LintResult }              from '@atls/code-runtime/eslint'

import EventEmitter                     from 'node:events'
import { readFileSync }                 from 'node:fs'
import { readFile }                     from 'node:fs/promises'
import { writeFile }                    from 'node:fs/promises'
import { isAbsolute }                   from 'node:path'
import { relative }                     from 'node:path'
import { resolve }                      from 'node:path'
import { join }                         from 'node:path'

import { globby }                       from 'globby'
import ignorer                          from 'ignore'

import { importCodeRuntimeModule }      from '@atls/raijin/runtime'

import { ignore }                       from './linter.patterns.js'
import { createPatterns }               from './linter.patterns.js'
import { createLintResult }             from './linter.utils.js'

type EslintRuntime = {
  Linter: typeof RuntimeLinter
  ESLint: typeof RuntimeESLint
  eslintconfig: Array<LinterConfig>
}

export interface LintOptions {
  fix?: boolean
  cache?: boolean
}

export class Linter extends EventEmitter {
  private ignore: ignorer.Ignore

  constructor(
    private readonly linter: LinterInstance,
    private readonly cacheLinter: ESLintInstance,
    private readonly config: Array<LinterConfig>,
    private readonly cwd: string
  ) {
    super()

    this.ignore = ignorer.default().add(ignore).add(this.getProjectIgnorePatterns())
  }

  static async initialize(rootCwd: string, cwd: string): Promise<Linter> {
    const {
      Linter: LinterConstructor,
      ESLint,
      eslintconfig,
    } = await importCodeRuntimeModule<EslintRuntime>('@atls/code-runtime/eslint')

    const linter = new LinterConstructor({ configType: 'flat' })

    const config: Array<LinterConfig> = eslintconfig.map((item) => ({
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

  async lintFile(filename: string, options?: LintOptions): Promise<LintResult> {
    const filePath = this.resolveFilePath(filename)
    const lintFilename = relative(this.cwd, filePath)
    const source = await readFile(filePath, 'utf8')

    if (options?.fix) {
      const { messages, fixed, output } = this.linter.verifyAndFix(source, this.config, {
        filename: lintFilename,
      })

      if (fixed) {
        await writeFile(filePath, output, 'utf8')
      }

      return createLintResult(filePath, output, messages)
    }

    return createLintResult(
      filePath,
      source,
      this.linter.verify(source, this.config, {
        filename: lintFilename,
      })
    )
  }

  async lintFiles(files: Array<string> = [], options?: LintOptions): Promise<Array<LintResult>> {
    const results: Array<LintResult> = []

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

  async lint(files?: Array<string>, options?: LintOptions): Promise<Array<LintResult>> {
    const filesForLint =
      files && files.length > 0
        ? files.map((file) => this.resolveFilePath(file))
        : await globby(createPatterns(this.cwd), { dot: true })

    const finalFiles = filesForLint.filter(
      (file) => this.ignore.filter([relative(this.cwd, file)]).length !== 0
    )

    if (options?.cache) {
      return this.lintWithCache(finalFiles)
    }

    return this.lintFiles(finalFiles, options)
  }

  private async lintWithCache(files: Array<string> = []): Promise<Array<LintResult>> {
    this.emit('start', { files })

    const results = await this.cacheLinter.lintFiles(files)

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

  private resolveFilePath(file: string): string {
    return isAbsolute(file) ? file : resolve(this.cwd, file)
  }
}
