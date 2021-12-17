import deepmerge            from 'deepmerge'
import ts                   from 'typescript'
import { Diagnostic }       from 'typescript'
import { CompilerOptions }  from 'typescript'

import { base }             from './config'
import { groupDiagnostics } from './diagnostics'
import { formatDiagnostic } from './diagnostics'

class TypeScript {
  constructor(private readonly cwd: string) {}

  formatDiagnostic(diagnostic, raw?) {
    return formatDiagnostic(this.cwd, diagnostic, raw)
  }

  check(include: Array<string> = []): Array<Diagnostic> {
    const config = this.getCompilerConfig(include)

    if (config.errors && config.errors.length > 0) {
      return config.errors
    }

    return this.run(config)
  }

  build(include: Array<string> = [], override: Partial<CompilerOptions> = {}): Array<Diagnostic> {
    const config = this.getCompilerConfig(include, override)

    if (config.errors && config.errors.length > 0) {
      return config.errors
    }

    return this.run(config, false)
  }

  private run(config, noEmit = true): Array<Diagnostic> {
    const program = ts.createProgram(config.fileNames, {
      ...config.options,
      noEmit,
    })

    const result = program.emit()

    return ts.getPreEmitDiagnostics(program).concat(result.diagnostics)
  }

  private getCompilerConfig(include: Array<string> = [], override: Partial<CompilerOptions> = {}) {
    return ts.parseJsonConfigFileContent(
      deepmerge(base, { compilerOptions: override }, { include } as any),
      ts.sys,
      this.cwd
    )
  }
}

export { TypeScript }
