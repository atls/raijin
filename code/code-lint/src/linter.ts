import { readFile }           from 'node:fs/promises'
import { relative }           from 'node:path'

import type { ESLint }        from '@atls/code-runtime/eslint'

import ignorerPkg             from 'ignore'
import { globby }             from 'globby'

import { Linter as ESLinter } from '@atls/code-runtime/eslint'
import { eslintconfig }       from '@atls/code-runtime/eslint'

import { ignore }             from './linter.patterns.js'
import { createPatterns }     from './linter.patterns.js'

// TODO: moduleResolution
const ignorer = ignorerPkg as any

export class Linter {
  constructor(private readonly cwd: string) {}

  async lint(files?: Array<string>): Promise<Array<ESLint.LintResult>> {
    if (files && files.length > 0) {
      return this.lintFiles(files)
    }

    return this.lintProject()
  }

  async lintProject(): Promise<Array<ESLint.LintResult>> {
    return this.lintFiles(await globby(createPatterns(this.cwd), { dot: true }))
  }

  async lintFiles(files: Array<string> = []): Promise<Array<ESLint.LintResult>> {
    const ignored = ignorer().add(ignore)

    const linter = new ESLinter({ configType: 'flat' })
    const config = [...eslintconfig, { files: ['**/*.*'] }]

    const results: Array<ESLint.LintResult> = await Promise.all(
      files
        .filter((file) => ignored.filter([relative(this.cwd, file)]).length !== 0)
        .map(async (filePath) => {
          const source = await readFile(filePath, 'utf8')

          const messages = linter.verify(source, config, { filename: filePath })

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
