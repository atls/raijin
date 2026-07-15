import type { CommandInput }                       from '@atls/raijin/commands'
import type { ESLintInstance }                     from '@atls/raijin/eslint'
import type { ESLint as RuntimeESLint }            from '@atls/raijin/eslint'
import type { LintResult }                         from '@atls/raijin/eslint'
import type { resolveEslintProject }               from '@atls/raijin/config/eslint'
import type { resolveEslintProjectIgnorePatterns } from '@atls/raijin/config/eslint'

import EventEmitter                                from 'node:events'
import { readFile }                                from 'node:fs/promises'
import { stat }                                    from 'node:fs/promises'
import { writeFile }                               from 'node:fs/promises'
import { relative }                                from 'node:path'
import { join }                                    from 'node:path'

import ignorer                                     from 'ignore'

import { createCommandInput }                      from '@atls/raijin/commands'
import { toPortableCwd }                           from '@atls/raijin/commands'
import { discoverFiles }                           from '@atls/raijin/filesystem'
import { toNativePath }                            from '@atls/raijin/filesystem'
import { findRaijinPackageBoundary }               from '@atls/raijin/runtime-resolver'
import { resolveRaijinRuntimeUrl }                 from '@atls/raijin/runtime-resolver'

import { ignore }                                  from './linter.patterns.js'
import { ignorePatterns }                          from './linter.patterns.js'
import { patterns }                                from './linter.patterns.js'

type EslintRuntime = {
  ESLint: typeof RuntimeESLint
}

type EslintConfig = {
  resolveEslintProject: typeof resolveEslintProject
  resolveEslintProjectIgnorePatterns: typeof resolveEslintProjectIgnorePatterns
}

const ESLINT_RUNTIME_SPECIFIER = '@atls/raijin/eslint'
const ESLINT_CONFIG_SPECIFIER = '@atls/raijin/config/eslint'

export const resolveEslintRuntimeUrl = (cwd: string): string =>
  resolveRaijinRuntimeUrl(cwd, ESLINT_RUNTIME_SPECIFIER)

const importEslintModules = async (cwd: string): Promise<EslintConfig & EslintRuntime> => {
  const packageCwd = findRaijinPackageBoundary(cwd) ?? cwd
  const [runtime, config] = await Promise.all([
    import(resolveRaijinRuntimeUrl(packageCwd, ESLINT_RUNTIME_SPECIFIER)) as Promise<EslintRuntime>,
    import(resolveRaijinRuntimeUrl(packageCwd, ESLINT_CONFIG_SPECIFIER)) as Promise<EslintConfig>,
  ])

  return {
    ESLint: runtime.ESLint,
    resolveEslintProject: config.resolveEslintProject,
    resolveEslintProjectIgnorePatterns: config.resolveEslintProjectIgnorePatterns,
  }
}

export interface LintOptions {
  fix?: boolean
  cache?: boolean
}

export class Linter extends EventEmitter {
  private ignore: ignorer.Ignore

  constructor(
    private readonly linter: ESLintInstance,
    private readonly fixLinter: ESLintInstance,
    private readonly cacheLinter: ESLintInstance,
    projectIgnorePatterns: ReadonlyArray<string>,
    private readonly cwd: string
  ) {
    super()

    this.ignore = ignorer
      .default()
      .add(ignore)
      .add([...projectIgnorePatterns])
  }

  static async initialize(rootCwd: string, cwd: string): Promise<Linter> {
    const { ESLint, resolveEslintProject, resolveEslintProjectIgnorePatterns } =
      await importEslintModules(cwd)
    const project = { cwd, eslint: ESLint, rootCwd }
    const linter = new ESLint(await resolveEslintProject(project))
    const fixLinter = new ESLint(await resolveEslintProject({ ...project, fix: true }))
    const cacheLinter = new ESLint(
      await resolveEslintProject({
        ...project,
        cache: true,
        cacheLocation: join(rootCwd, '.config/eslint/.eslintcache'),
      })
    )
    const projectIgnorePatterns = await resolveEslintProjectIgnorePatterns(cwd)

    return new Linter(linter, fixLinter, cacheLinter, projectIgnorePatterns, cwd)
  }

  async lintFile(filename: string, options?: LintOptions): Promise<LintResult | undefined> {
    const eslint = this.resolveLinter(options)

    if (await eslint.isPathIgnored(filename)) {
      return undefined
    }

    return this.lintUnignoredFile(filename, eslint, options)
  }

  async lintFiles(files: Array<string> = [], options?: LintOptions): Promise<Array<LintResult>> {
    const results: Array<LintResult> = []
    const eslint = this.resolveLinter(options)
    const ignored = await Promise.all(files.map(async (file) => eslint.isPathIgnored(file)))
    const lintableFiles = files.filter((_, index) => !ignored[index])

    this.emit('start', { files: lintableFiles })

    for await (const file of lintableFiles) {
      this.emit('lint:start', { file })

      const result = await this.lintUnignoredFile(file, eslint, options)

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

  private resolveLinter(options?: LintOptions): ESLintInstance {
    return options?.fix ? this.fixLinter : this.linter
  }

  private async lintUnignoredFile(
    filename: string,
    eslint: ESLintInstance,
    options?: LintOptions
  ): Promise<LintResult> {
    const filePath = filename
    const source = await readFile(filePath, 'utf8')
    const [result] = await eslint.lintText(source, { filePath })

    if (options?.fix && result.output !== undefined) {
      await writeFile(filePath, result.output, 'utf8')
    }

    return {
      ...result,
      source: result.source ?? source,
    }
  }

  private async lintWithCache(files: Array<string> = []): Promise<Array<LintResult>> {
    const ignored = await Promise.all(
      files.map(async (file) => this.cacheLinter.isPathIgnored(file))
    )
    const lintableFiles = files.filter((_, index) => !ignored[index])

    this.emit('start', { files: lintableFiles })

    const results = lintableFiles.length ? await this.cacheLinter.lintFiles(lintableFiles) : []

    for (const result of results) {
      this.emit('lint:end', { result })
    }

    this.emit('end', { results })

    return results
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
