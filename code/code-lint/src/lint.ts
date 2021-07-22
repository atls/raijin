/* eslint-disable no-restricted-syntax */
import globby                                     from 'globby'
import ignore                                     from 'ignore'
import path                                       from 'path'
import { CLIEngine }                              from 'eslint'

import { createPatterns, ignore as ignoreConfig } from './config'

interface Options {
  fix?: boolean
}

class Linter {
  engine: CLIEngine

  cwd: string

  fix: boolean

  constructor({ fix = false }: Options, projectCwd?: string) {
    this.cwd = projectCwd || process.cwd()

    this.fix = fix

    this.engine = new CLIEngine({
      baseConfig: {
        extends: [require.resolve('../rules/base')],
      },
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      useEslintrc: false,
      cwd: path.join(__dirname, '../'),
      cacheLocation: path.join(this.cwd, '.yarn', '.eslintcache'),
      fix,
    })
  }

  lintFiles(files: string[] = []) {
    const ignorer = ignore().add(ignoreConfig)
    const report = this.engine.executeOnFiles(
      files.filter((file) => ignorer.filter([path.relative(this.cwd, file)]).length !== 0)
    )

    if (this.fix) {
      CLIEngine.outputFixes(report)
    }

    return report
  }

  lint() {
    const ignorer = ignore().add(ignoreConfig)

    const patterns = createPatterns(this.cwd)

    const files = globby
      .sync(patterns, { dot: true, nodir: true } as any)
      .filter((file) => ignorer.filter([path.relative(this.cwd, file)]).length !== 0)

    return this.lintFiles(files)
  }

  format(results: any, format = 'stylish') {
    const { engine } = this
    const formatter: any = engine.getFormatter(format)

    let rulesMeta

    return formatter(results, {
      get rulesMeta() {
        if (!rulesMeta) {
          rulesMeta = {}

          // @ts-ignore
          for (const [ruleId, rule] of engine.getRules()) {
            rulesMeta[ruleId] = rule.meta
          }
        }
        return rulesMeta
      },
    })
  }
}

export { Linter }
