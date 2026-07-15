/* eslint-disable @typescript-eslint/no-shadow */

import type { CommandInput }               from '@atls/raijin/commands'
import type { TypeScriptProjectSelection } from '@atls/raijin/config/typescript'
import type { resolveTypeScriptProject }   from '@atls/raijin/config/typescript'
import type { ts as typescript }           from '@atls/raijin/typescript'

import EventEmitter                        from 'node:events'

import { toCommandArguments }              from '@atls/raijin/commands'
import { toPortableCwd }                   from '@atls/raijin/commands'
import { findRaijinPackageBoundary }       from '@atls/raijin/runtime-resolver'
import { resolveRaijinRuntimeUrl }         from '@atls/raijin/runtime-resolver'

import { transformJsxToJsExtension }       from './transformers/index.js'

type TypeScriptConfig = {
  resolveTypeScriptProject: typeof resolveTypeScriptProject
}

type TypeScriptRuntime = {
  ts: typeof typescript
}

const TYPESCRIPT_CONFIG_SPECIFIER = '@atls/raijin/config/typescript'
const TYPESCRIPT_RUNTIME_SPECIFIER = '@atls/raijin/typescript'

export type TypeScriptOptions = {
  fallbackPatterns?: Array<string>
  manifestCwds?: Array<string>
}

export const resolveTypeScriptRuntimeUrl = (cwd: string): string =>
  resolveRaijinRuntimeUrl(cwd, TYPESCRIPT_RUNTIME_SPECIFIER)

export class TypeScript extends EventEmitter {
  private config?: Promise<TypeScriptConfig>

  private readonly fallbackPatterns: Array<string>

  private readonly manifestCwds: Array<string>

  private readonly packageCwd: string

  constructor(
    private readonly ts: typeof typescript,
    private readonly cwd: string,
    options: TypeScriptOptions = {}
  ) {
    super()

    this.fallbackPatterns = options.fallbackPatterns ?? []
    this.manifestCwds = Array.from(
      new Set(
        options.manifestCwds && options.manifestCwds.length > 0 ? options.manifestCwds : [cwd]
      )
    )
    this.packageCwd = findRaijinPackageBoundary(cwd) ?? cwd
  }

  static async initialize(cwd: string, options: TypeScriptOptions = {}): Promise<TypeScript> {
    const packageCwd = findRaijinPackageBoundary(cwd) ?? cwd
    const { ts } = (await import(
      resolveRaijinRuntimeUrl(packageCwd, TYPESCRIPT_RUNTIME_SPECIFIER)
    )) as TypeScriptRuntime

    return new TypeScript(ts, cwd, options)
  }

  async check(input?: CommandInput): Promise<Array<typescript.Diagnostic>> {
    const selection: TypeScriptProjectSelection | undefined = input
      ? {
          kind: input.source === 'generated' ? 'fallback' : 'explicit',
          patterns: toCommandArguments(input, toPortableCwd(this.cwd)),
        }
      : undefined

    return this.run(selection)
  }

  async build(
    include?: Array<string>,
    override: Partial<typescript.CompilerOptions> = {}
  ): Promise<Array<typescript.Diagnostic>> {
    return this.run(include ? { kind: 'explicit', patterns: include } : undefined, override, false)
  }

  private async run(
    selection: TypeScriptProjectSelection | undefined = undefined,
    override: Partial<typescript.CompilerOptions> = {},
    noEmit = true
  ): Promise<Array<typescript.Diagnostic>> {
    const { resolveTypeScriptProject } = await this.importConfig()
    let projectConfig = await resolveTypeScriptProject({
      compilerOptions: override,
      cwd: this.cwd,
      manifestCwds: this.manifestCwds,
      selection,
      typescript: this.ts,
    })

    if (
      noEmit &&
      selection === undefined &&
      projectConfig.errors.length === 0 &&
      projectConfig.fileNames.length === 0 &&
      (projectConfig.projectReferences?.length ?? 0) > 0 &&
      this.fallbackPatterns.length > 0
    ) {
      projectConfig = await resolveTypeScriptProject({
        compilerOptions: override,
        cwd: this.cwd,
        manifestCwds: this.manifestCwds,
        selection: {
          kind: 'fallback',
          patterns: this.fallbackPatterns,
        },
        typescript: this.ts,
      })
    }

    if (projectConfig.errors.length > 0) {
      this.emit('start', { files: [] })
      this.emit('end', { diagnostics: projectConfig.errors })

      return [...projectConfig.errors]
    }

    const fileNames = [...projectConfig.fileNames]

    this.emit('start', { files: fileNames })

    const program = this.ts.createProgram({
      rootNames: fileNames,
      options: {
        ...projectConfig.options,
        noEmit,
      },
      projectReferences: projectConfig.projectReferences
        ? [...projectConfig.projectReferences]
        : undefined,
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

  private async importConfig(): Promise<TypeScriptConfig> {
    this.config ??= import(
      resolveRaijinRuntimeUrl(this.packageCwd, TYPESCRIPT_CONFIG_SPECIFIER)
    ) as Promise<TypeScriptConfig>

    return this.config
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
}
