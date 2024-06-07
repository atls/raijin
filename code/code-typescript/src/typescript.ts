import deepmerge                     from 'deepmerge'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import tsconfig                      from '@atls/config-typescript'
import { ts }                        from '@atls/code-runtime/typescript'

import { transformJsxToJsExtension } from './transformers/index.js'

class TypeScript {
  constructor(private readonly cwd: string) {}

  async check(include: Array<string> = []): Promise<Array<ts.Diagnostic>> {
    return this.run(include)
  }

  async build(
    include: Array<string> = [],
    override: Partial<ts.CompilerOptions> = {}
  ): Promise<Array<ts.Diagnostic>> {
    return this.run(include, override, false)
  }

  private async run(
    include: Array<string> = [],
    override: Partial<ts.CompilerOptions> = {},
    noEmit = true
  ): Promise<Array<ts.Diagnostic>> {
    const projectIgnorePatterns = await this.getProjectIgnorePatterns()

    const skipLibCheck = await this.getLibCheckOption()

    const config = deepmerge(tsconfig, { compilerOptions: override, skipLibCheck }, {
      compilerOptions: { rootDir: this.cwd },
      include,
      exclude: [...tsconfig.exclude, ...projectIgnorePatterns]
    } as object)

    const { fileNames, options, errors } = ts.parseJsonConfigFileContent(config, ts.sys, this.cwd)

    if (errors.length > 0) {
      return errors
    }

    const program = ts.createProgram(fileNames, {
      ...options,
      noEmit,
    })

    const result = program.emit(undefined, undefined, undefined, undefined, {
      after: [transformJsxToJsExtension],
    })

    return this.filterDiagnostics(ts.getPreEmitDiagnostics(program).concat(result.diagnostics))
  }

  private filterDiagnostics(diagnostics: Array<ts.Diagnostic>): Array<ts.Diagnostic> {
    return diagnostics
      .filter((diagnostic) => diagnostic.code !== 2209)
      .filter(
        (diagnostic) => !(diagnostic.code === 1479 && diagnostic.file?.fileName.includes('/.yarn/'))
      )
      .filter(
        (diagnostic) => !(diagnostic.code === 2834 && diagnostic.file?.fileName.includes('/.yarn/'))
      )
      .filter(
        (diagnostic) =>
          !(diagnostic.code === 7016 && diagnostic.file?.fileName.includes('/lexical/'))
      )
      .filter(
        (diagnostic) =>
          !(
            [2315, 2411, 2304, 7006, 7016].includes(diagnostic.code) &&
            diagnostic.file?.fileName.includes('/@strapi/')
          )
      )
      .filter(
        (diagnostic) =>
          !(
            [2688, 2307, 2503].includes(diagnostic.code) &&
            diagnostic.file?.fileName.includes('/pkg-tests-core/')
          )
      )
  }

  private getProjectIgnorePatterns(): Array<string> {
    const content = readFileSync(join(this.cwd, 'package.json'), 'utf-8')

    const { typecheckIgnorePatterns = [] } = JSON.parse(content)

    return typecheckIgnorePatterns
  }

  private getLibCheckOption(): boolean {
    const content = readFileSync(join(this.cwd, 'package.json'), 'utf-8')

    const { typecheckSkipLibCheck = false } = JSON.parse(content)

    return typecheckSkipLibCheck
  }
}

export { TypeScript }
