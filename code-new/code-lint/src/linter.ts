import { readFile }           from 'node:fs/promises'

import type { ESLint }        from 'eslint'

import globby                 from 'globby'
import ignorer                from 'ignore'
import { Linter as ESLinter } from 'eslint'
import { join }               from 'path'
import { relative }           from 'path'

import { eslintConfig }           from '@atls/config-eslint-new'

import { ignore }             from './linter.patterns'
import { createPatterns }     from './linter.patterns'

export class Linter {
  constructor(private readonly cwd: string) {}

  private async getProjectIgnorePatterns(): Promise<Array<string>> {
    const content = await readFile(join(this.cwd, 'package.json'), 'utf-8')

    const { linterIgnorePatterns = [] } = JSON.parse(content)

    return linterIgnorePatterns
  }

  async lint(files?: Array<string>): Promise<Array<ESLint.LintResult>> {
    if (files && files.length > 0) {
      return this.lintFiles(files)
    }

    return this.lintProject()
  }

  async lintProject(): Promise<Array<ESLint.LintResult>> {
    // @ts-ignore
    return this.lintFiles(await globby(createPatterns(this.cwd), { dot: true, nodir: true } as any))
  }

  async lintFiles(files: Array<string> = []): Promise<Array<ESLint.LintResult>> {
    const ignored = ignorer()
      .add(ignore)
      .add(await this.getProjectIgnorePatterns())

    const linterConfig: any = { configType: 'flat' }
    const linter = new ESLinter(linterConfig)

    // @ts-ignore
    const results: Array<ESLint.LintResult> = await Promise.all(
      files
        .filter((file) => ignored.filter([relative(this.cwd, file)]).length !== 0)
        .map(async (filePath) => {
          const source = await readFile(filePath, 'utf8')

          // @ts-ignore
          const messages = linter.verify(source, eslintConfig, { filename: filePath })

          return {
            filePath,
            source,
            messages,
            errorCount: messages.filter((message) => message.severity === 1).length,
            fatalErrorCount: messages.filter((message) => message.severity === 0).length,
            warningCount: messages.filter((message) => message.severity === 2).length,
            fixableErrorCount: 0,
            fixableWarningCount: 0,
            usedDeprecatedRules: [],
          }
        })
    )

    return results
  }
}
