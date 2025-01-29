import type { ts as typescript }     from '@atls/code-runtime/typescript'

import EventEmitter                  from 'node:events'
import { readFileSync }              from 'node:fs'
import { join }                      from 'node:path'

import tsconfig                      from '@atls/config-typescript'

import { transformJsxToJsExtension } from './transformers/index.js'

export class TypeScript extends EventEmitter {
  constructor(
    private readonly ts: typeof typescript,
    private readonly cwd: string
  ) {
    super()
  }

  static async initialize(cwd: string): Promise<TypeScript> {
    const { ts } = await import('@atls/code-runtime/typescript')

    return new TypeScript(ts, cwd)
  }

  async check(include: Array<string> = []): Promise<Array<typescript.Diagnostic>> {
    return this.run(include)
  }

  async build(
    include: Array<string> = [],
    override: Partial<typescript.CompilerOptions> = {}
  ): Promise<Array<typescript.Diagnostic>> {
    return this.run(include, override, false)
  }

  private async run(
    include: Array<string> = [],
    override: Partial<typescript.CompilerOptions> = {},
    noEmit = true
  ): Promise<Array<typescript.Diagnostic>> {
    const projectIgnorePatterns = this.getProjectIgnorePatterns()

    const skipLibCheck = this.getLibCheckOption()

    const config = {
      ...tsconfig,
      compilerOptions: {
        ...tsconfig.compilerOptions,
        ...override,
        skipLibCheck,
      },
      include,
      exclude: [...tsconfig.exclude, ...projectIgnorePatterns],
    }

    const { fileNames, options, errors } = this.ts.parseJsonConfigFileContent(
      config,
      this.ts.sys,
      this.cwd
    )

    if (errors.length > 0) {
      this.emit('start', { files: [] })
      this.emit('end', { diagnostics: errors })

      return errors
    }

    this.emit('start', { files: fileNames })

    const program = this.ts.createProgram(fileNames, {
      ...options,
      noEmit,
    })

    const beforeTransformer: typescript.TransformerFactory<typescript.SourceFile> = (_) =>
      (sourceFile) => {
        this.emit('build:start', { file: sourceFile.fileName })

        return sourceFile
      }

    const afterTransformer: typescript.TransformerFactory<typescript.SourceFile> = (_) =>
      (sourceFile) => {
        this.emit('build:end', { file: sourceFile.fileName })

        return sourceFile
      }

    const result = program.emit(undefined, undefined, undefined, undefined, {
      before: [beforeTransformer],
      after: [afterTransformer, transformJsxToJsExtension(this.ts)],
    })

    const diagnostics = this.filterDiagnostics(
      this.ts.getPreEmitDiagnostics(program).concat(result.diagnostics)
    )

    this.emit('end', { diagnostics })

    return diagnostics
  }

  private filterDiagnostics(
    diagnostics: Array<typescript.Diagnostic>
  ): Array<typescript.Diagnostic> {
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
          !(diagnostic.code === 6133 && diagnostic.file?.fileName.includes('/@yarnpkg/libui/'))
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
      .filter(
        (diagnostics) =>
          !(
            [2307].includes(diagnostics.code) &&
            diagnostics.file?.fileName.includes('/@nestjs/testing/')
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
