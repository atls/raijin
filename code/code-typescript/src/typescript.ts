import deepmerge                     from 'deepmerge'

import tsconfig                      from '@atls/config-typescript'
import { ts }                        from '@atls/code-runtime/typescript'

import { transformJsxToJsExtension } from './transformers/index.js'

class TypeScript {
  constructor(private readonly cwd: string) {}

  check(include: Array<string> = []): Promise<Array<ts.Diagnostic>> {
    return this.run(include, { allowImportingTsExtensions: true })
  }

  build(
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
    const config = deepmerge(tsconfig, { compilerOptions: override }, {
      compilerOptions: { rootDir: this.cwd },
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

    return ts
      .getPreEmitDiagnostics(program)
      .filter((diagnostic) => ![2209].includes(diagnostic.code))
      .concat(result.diagnostics)
  }
}

export { TypeScript }
