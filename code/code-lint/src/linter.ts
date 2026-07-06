/* eslint-disable n/no-sync */

import type { ESLintInstance }          from '@atls/raijin/eslint'
import type { ESLint as RuntimeESLint } from '@atls/raijin/eslint'
import type { LinterConfig }            from '@atls/raijin/eslint'
import type { LinterInstance }          from '@atls/raijin/eslint'
import type { Linter as RuntimeLinter } from '@atls/raijin/eslint'
import type { LintResult }              from '@atls/raijin/eslint'

import EventEmitter                     from 'node:events'
import { readFileSync }                 from 'node:fs'
import { readFile }                     from 'node:fs/promises'
import { stat }                         from 'node:fs/promises'
import { writeFile }                    from 'node:fs/promises'
import { isAbsolute }                   from 'node:path'
import { relative }                     from 'node:path'
import { resolve }                      from 'node:path'
import { join }                         from 'node:path'

import { globby }                       from 'globby'
import ignorer                          from 'ignore'

import { resolveRaijinRuntimeUrl }      from '@atls/raijin/runtime-resolver'

import { ignore }                       from './linter.patterns.js'
import { createPatterns }               from './linter.patterns.js'
import { createLintResult }             from './linter.utils.js'

type EslintRuntime = {
  Linter: typeof RuntimeLinter
  ESLint: typeof RuntimeESLint
  eslintconfig: Array<LinterConfig>
}

const ESLINT_RUNTIME_SPECIFIER = '@atls/raijin/eslint'

export const resolveEslintRuntimeUrl = (cwd: string): string =>
  resolveRaijinRuntimeUrl(cwd, ESLINT_RUNTIME_SPECIFIER)

const importEslintRuntime = async (cwd: string): Promise<EslintRuntime> =>
  (await import(resolveEslintRuntimeUrl(cwd))) as EslintRuntime

const exists = async (path: string): Promise<boolean> => {
  try {
    await stat(path)

    return true
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
      return false
    }

    throw error
  }
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
    private readonly rootCwd: string,
    private readonly tsconfigRootCwd: string,
    private readonly cwd: string
  ) {
    super()

    this.ignore = ignorer.default().add(ignore).add(this.getProjectIgnorePatterns())
  }

  static async initialize(rootCwd: string, cwd: string): Promise<Linter> {
    const { Linter: LinterConstructor, ESLint, eslintconfig } = await importEslintRuntime(cwd)

    const linter = new LinterConstructor({ configType: 'flat' })
    const tsconfigRootCwd = (await exists(join(cwd, 'tsconfig.json'))) ? cwd : rootCwd

    const config: Array<LinterConfig> = eslintconfig.map((item) => ({
      ...item,
      languageOptions: {
        ...(item.languageOptions || {}),
        parserOptions: {
          ...(item.languageOptions?.parserOptions || {}),
          tsconfigRootDir: tsconfigRootCwd,
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

    return new Linter(linter, eslint, config, rootCwd, tsconfigRootCwd, cwd)
  }

  async lintFile(filename: string, options?: LintOptions): Promise<LintResult> {
    const filePath = this.resolveFilePath(filename)
    const lintFilename = relative(this.tsconfigRootCwd, filePath)
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
        ? await this.resolveLintFiles(files)
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
    const content = readFileSync(join(this.cwd, 'package.json'), 'utf-8')

    const { linterIgnorePatterns = [] } = JSON.parse(content)

    return linterIgnorePatterns as Array<string>
  }

  private async resolveLintFiles(files: Array<string>): Promise<Array<string>> {
    const resolvedFiles: Array<string> = []

    for await (const file of files) {
      const targetPath = this.resolveFilePath(file)
      let targetStat

      try {
        targetStat = await stat(targetPath)
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
          throw new Error(`Linter target does not exist: ${file}`)
        }

        throw error
      }

      if (targetStat.isDirectory()) {
        resolvedFiles.push(
          ...(await globby(createPatterns('.'), {
            cwd: targetPath,
            dot: true,
            absolute: true,
          }))
        )
      } else {
        resolvedFiles.push(targetPath)
      }
    }

    return Array.from(new Set(resolvedFiles))
  }

  private resolveFilePath(file: string): string {
    return isAbsolute(file) ? file : resolve(this.cwd, file)
  }
}
