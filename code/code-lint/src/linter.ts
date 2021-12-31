import { readFile }           from 'node:fs/promises'
import { relative }           from 'node:path'

import type { ESLint }        from 'eslint'

import globby                 from 'globby'
import ignorer                from 'ignore'
import { Linter as ESLinter } from 'eslint'

import eslintconfig           from '@atls/config-eslint'

import { ignore }             from './linter.patterns'
import { createPatterns }     from './linter.patterns'

export class Linter {
  constructor(private readonly cwd: string) {}

  async lint(files?: Array<string>): Promise<Array<ESLint.LintResult>> {
    if (files && files.length > 0) {
      return this.lintFiles(files)
    }

    return this.lintProject()
  }

  async lintProject(): Promise<Array<ESLint.LintResult>> {
    return this.lintFiles(await globby(createPatterns(this.cwd), { dot: true, nodir: true } as any))
  }

  async lintFiles(files: Array<string> = []): Promise<Array<ESLint.LintResult>> {
    const ignored = ignorer().add(ignore)

    const linterConfig: any = { configType: 'flat' }
    const linter = new ESLinter(linterConfig)

    const results: Array<ESLint.LintResult> = await Promise.all(
      files
        .filter((file) => ignored.filter([relative(this.cwd, file)]).length !== 0)
        .map(async (filePath) => {
          const source = await readFile(filePath, 'utf8')

          // @ts-ignore
          const messages = linter.verify(source, eslintconfig, { filename: filePath })

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
