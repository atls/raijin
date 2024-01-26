import { readFile }             from 'node:fs/promises'

import type { Diagnostic }      from 'typescript'
import type { CompilerOptions } from 'typescript'

import deepmerge                from 'deepmerge'
import ts                       from 'typescript'
import { join }                 from 'path'

import { tsConfig }             from '@atls/config-typescript'

class TypeScript {
  constructor(private readonly cwd: string) {}

  private async getProjectIgnorePatterns(): Promise<Array<string>> {
    const content = await readFile(join(this.cwd, 'package.json'), 'utf-8')

    const { typecheckIgnorePatterns = [] } = JSON.parse(content)

    return typecheckIgnorePatterns
  }

  private async getLibCheckOption(): Promise<boolean> {
    const content = await readFile(join(this.cwd, 'package.json'), 'utf-8')

    const { typecheckSkipLibCheck = false } = JSON.parse(content)

    return typecheckSkipLibCheck
  }

  private async getProjectConfiguration(): Promise<Array<string>> {
    const content = await readFile(join(this.cwd, 'tsconfig.json'), 'utf-8')

    return JSON.parse(content)
  }

  check(include: Array<string> = []): Promise<Array<Diagnostic>> {
    return this.run(include)
  }

  build(
    include: Array<string> = [],
    override: Partial<CompilerOptions> = {}
  ): Promise<Array<Diagnostic>> {
    return this.run(include, override, false)
  }

  private async run(
    include: Array<string> = [],
    override: Partial<CompilerOptions> = {},
    noEmit = true
  ): Promise<Array<Diagnostic>> {
    const projectIgnorePatterns = await this.getProjectIgnorePatterns()

    const skipLibCheck = await this.getLibCheckOption()

    const config = deepmerge(
      tsConfig,
      {
        compilerOptions: { ...override, skipLibCheck },
        exclude: [...tsConfig.exclude, ...projectIgnorePatterns],
      },
      {
        include,
      } as any
    )

    const { fileNames, options, errors } = ts.parseJsonConfigFileContent(config, ts.sys, this.cwd)

    if (errors?.length > 0) {
      return errors
    }

    const program = ts.createProgram(fileNames, {
      ...options,
      noEmit,
    })

    const result = program.emit()

    return ts.getPreEmitDiagnostics(program).concat(result.diagnostics)
  }
}

export { TypeScript }
