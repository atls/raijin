import type { Diagnostic }           from 'typescript'
import type { CompilerOptions }      from 'typescript'

import deepmerge                     from 'deepmerge'
import ts                            from 'typescript'

import tsconfig                      from '@atls/config-typescript'

import { transformJsxToJsExtension } from './transformers/index.js'

interface TypeScriptBuildOptions {
  replaceJsxExt?: boolean
}

class TypeScript {
  constructor(private readonly cwd: string) {}

  check(include: Array<string> = []): Promise<Array<Diagnostic>> {
    return this.run(include, { allowImportingTsExtensions: true })
  }

  build(
    include: Array<string> = [],
    override: Partial<CompilerOptions> = {},
    options?: TypeScriptBuildOptions
  ): Promise<Array<Diagnostic>> {
    return this.run(include, override, false)
  }

  private async run(
    include: Array<string> = [],
    override: Partial<CompilerOptions> = {},
    noEmit = true
  ): Promise<Array<Diagnostic>> {
    const config = deepmerge(tsconfig, { compilerOptions: override }, {
      include,
    } as any)

    const { fileNames, options, errors } = ts.parseJsonConfigFileContent(config, ts.sys, this.cwd)

    if (errors?.length > 0) {
      return errors
    }

    const program = ts.createProgram(fileNames, {
      ...options,
      noEmit,
    })

    const result = program.emit(undefined, undefined, undefined, undefined, {
      after: [transformJsxToJsExtension],
    })

    return ts.getPreEmitDiagnostics(program).concat(result.diagnostics)
  }
}

export { TypeScript }
