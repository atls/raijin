import { eslintFlatConfig } from '@atls/config-eslint-new'

import type { ESLint }        from 'eslint'
import { Linter as ESLinter } from 'eslint'

import globby       from 'globby'
import ignorer      from 'ignore'
import { readFile } from 'node:fs/promises'
import { join }     from 'path'
import { relative } from 'path'

import { ignore }         from './linter.patterns'
import { createPatterns } from './linter.patterns'

export class Linter {
  constructor(private readonly cwd: string) {}

  async lint(files?: string[]): Promise<Array<ESLint.LintResult>> {
    if (files && files.length > 0) {
      return this.lintFiles(files)
    }

    return this.lintProject()
  }

  async lintProject(): Promise<Array<ESLint.LintResult>> {
    return this.lintFiles(await globby(createPatterns(this.cwd), {
      dot: true, nodir: true,
    } as any) as unknown as string[])
  }

  async lintFiles(files: string[] = []): Promise<Array<ESLint.LintResult>> {
    const ignored = ignorer()
      .add(ignore)
      .add(await this.getProjectIgnorePatterns())

    const linter = new ESLinter({ configType: 'flat' })

    // @ts-ignore
    const results: Array<ESLint.LintResult> = await Promise.all(
      files
        .filter((file) => ignored.filter([relative(this.cwd, file)]).length !== 0)
        .map(async (filePath) => {
          const source = await readFile(filePath, 'utf8')

          const messages = linter.verify(source, eslintFlatConfig, { filename: filePath })

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
        }),
    )

    return results
  }

  private async getProjectIgnorePatterns(): Promise<Array<string>> {
    const content = await readFile(join(this.cwd, 'package.json'), 'utf-8')

    const { linterIgnorePatterns = [] } = JSON.parse(content)

    return linterIgnorePatterns
  }
}
