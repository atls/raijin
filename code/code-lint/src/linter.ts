/* eslint-disable n/no-sync */

import type { CommandInput }            from '@atls/raijin/commands'
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
import { relative }                     from 'node:path'
import { join }                         from 'node:path'

import ignorer                          from 'ignore'

import { createCommandInput }           from '@atls/raijin/commands'
import { toPortableCwd }                from '@atls/raijin/commands'
import { discoverFiles }                from '@atls/raijin/filesystem'
import { toNativePath }                 from '@atls/raijin/filesystem'
import { resolveRaijinRuntimeUrl }      from '@atls/raijin/runtime-resolver'

import { ignore }                       from './linter.patterns.js'
import { ignorePatterns }               from './linter.patterns.js'
import { patterns }                     from './linter.patterns.js'
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
    const filePath = filename
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

  async lint(input?: CommandInput, options?: LintOptions): Promise<Array<LintResult>> {
    const lintInput =
      input ??
      createCommandInput({
        cwd: toPortableCwd(this.cwd),
        source: 'generated',
        targets: await discoverFiles({
          cwd: toPortableCwd(this.cwd),
          patterns,
          ignore: ignorePatterns,
          dot: true,
        }),
      })
    const filesForLint = input
      ? await this.resolveLintFiles(lintInput)
      : lintInput.targets.map(({ path }) => toNativePath(path))

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

  private async resolveLintFiles(input: CommandInput): Promise<Array<string>> {
    const resolvedFiles: Array<string> = []

    for await (const target of input.targets) {
      const targetPath = toNativePath(target.path)
      let targetStat

      try {
        targetStat = await stat(targetPath)
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && error.code === 'ENOENT') {
          throw new Error(`Linter target does not exist: ${target.request}`)
        }

        throw error
      }

      if (targetStat.isDirectory()) {
        resolvedFiles.push(
          ...(
            await discoverFiles({
              cwd: target.path,
              patterns,
              ignore: ignorePatterns,
              dot: true,
            })
          ).map((file) => toNativePath(file))
        )
      } else {
        resolvedFiles.push(targetPath)
      }
    }

    return Array.from(new Set(resolvedFiles))
  }
}
