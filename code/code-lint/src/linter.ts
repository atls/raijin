import { relative }               from 'node:path'
import { join }                   from 'node:path'

import globby                     from 'globby'
import ignore                     from 'ignore'
import { Ignore }                 from 'ignore'
import { ESLint }                 from 'eslint'

import { ignore as ignoreConfig } from './config'
import { createPatterns }         from './config'

import { LintProgressReport }     from './lint.progress-report'
import { NullLintProgressReport } from './lint.progress-report'

export class Linter {
  engine: ESLint

  ignorer: Ignore

  constructor(private readonly cwd: string) {
    this.ignorer = ignore().add(ignoreConfig)

    this.engine = new ESLint({
      ignore: false,
      baseConfig: {
        extends: [require.resolve('../rules/base')],
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      useEslintrc: false,
      cwd: join(__dirname, '../'),
      cacheLocation: join(this.cwd, '.yarn', '.eslintcache'),
    })
  }

  async lint(files?: Array<string>, progress: LintProgressReport = new NullLintProgressReport()) {
    if (files && files.length > 0) {
      return this.lintFiles(files, progress)
    } else {
      return this.lintProject(progress)
    }
  }

  async lintProject(progress: LintProgressReport = new NullLintProgressReport()) {
    return await this.lintFiles(
      await globby(createPatterns(this.cwd), { dot: true, nodir: true } as any),
      progress
    )
  }

  async lintFiles(
    files: Array<string> = [],
    progress: LintProgressReport = new NullLintProgressReport()
  ) {
    const finalFiles = files.filter(
      (file) => this.ignorer.filter([relative(this.cwd, file)]).length !== 0
    )

    progress.start(finalFiles)

    const results: Array<any> = []

    for await (const file of finalFiles) {
      const result = await this.engine.lintFiles(file)

      results.push(result)

      progress.lint(file, result)
    }

    progress.end()

    return results.flat()
  }

  loadFormatter(format: string = 'stylish') {
    return this.engine.loadFormatter(format)
  }
}
