/* eslint-disable n/no-sync, @typescript-eslint/no-shadow */

import type { ts as typescript }     from '@atls/raijin/typescript'

import EventEmitter                  from 'node:events'
import { existsSync }                from 'node:fs'
import { readFileSync }              from 'node:fs'
import { createRequire }             from 'node:module'
import { join }                      from 'node:path'
import { pathToFileURL }             from 'node:url'

import tsconfig                      from '@atls/raijin/typescript-config'

import { transformJsxToJsExtension } from './transformers/index.js'

const PROJECT_TS_CONFIG = 'tsconfig.json'
const PACKAGE_MANIFEST = 'package.json'
const TYPESCRIPT_RUNTIME_SPECIFIER = '@atls/raijin/typescript'

type TSConfigShape = Record<string, unknown> & {
  compilerOptions?: Record<string, unknown>
  exclude?: unknown
}

type PackageManifestShape = Record<string, unknown> & {
  typecheckIgnorePatterns?: Array<string>
  typecheckSkipLibCheck?: boolean
}

const asCompilerOptions = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}

const asStringArray = (value: unknown): Array<string> =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

export const resolveTypeScriptRuntimeUrl = (cwd: string): string => {
  const workspaceRequire = createRequire(join(cwd, PACKAGE_MANIFEST))

  return pathToFileURL(workspaceRequire.resolve(TYPESCRIPT_RUNTIME_SPECIFIER)).href
}

export class TypeScript extends EventEmitter {
  constructor(
    private readonly ts: typeof typescript,
    private readonly cwd: string
  ) {
    super()
  }

  static async initialize(cwd: string): Promise<TypeScript> {
    const { ts } = (await import(resolveTypeScriptRuntimeUrl(cwd))) as { ts: typeof typescript }

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
    const projectConfig = this.readProjectTSConfig()

    if (projectConfig.errors.length > 0) {
      this.emit('start', { files: [] })
      this.emit('end', { diagnostics: projectConfig.errors })

      return projectConfig.errors
    }

    const projectCompilerOptions = asCompilerOptions(projectConfig.config.compilerOptions)
    const projectIgnorePatterns = this.getProjectIgnorePatterns()
    const projectExcludePatterns = asStringArray(projectConfig.config.exclude)
    const skipLibCheck = this.getLibCheckOption(projectCompilerOptions)

    const config = {
      ...tsconfig,
      ...projectConfig.config,
      compilerOptions: {
        ...tsconfig.compilerOptions,
        ...projectCompilerOptions,
        ...override,
        skipLibCheck,
      },
      include,
      exclude: Array.from(
        new Set([...tsconfig.exclude, ...projectExcludePatterns, ...projectIgnorePatterns])
      ),
    }

    const { fileNames, options, errors } = this.ts.parseJsonConfigFileContent(
      config,
      this.ts.sys,
      this.cwd,
      undefined,
      projectConfig.configFileName
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
    const { typecheckIgnorePatterns = [] } = this.readPackageManifest()

    return typecheckIgnorePatterns
  }

  private getLibCheckOption(projectCompilerOptions: Record<string, unknown>): boolean {
    const manifest = this.readPackageManifest()
    const defaultCompilerOptions = asCompilerOptions(tsconfig.compilerOptions)

    if (Object.hasOwn(manifest, 'typecheckSkipLibCheck')) {
      return manifest.typecheckSkipLibCheck!
    }

    if (typeof projectCompilerOptions.skipLibCheck === 'boolean') {
      return projectCompilerOptions.skipLibCheck
    }

    if (typeof defaultCompilerOptions.skipLibCheck === 'boolean') {
      return defaultCompilerOptions.skipLibCheck
    }

    return false
  }

  private readPackageManifest(): PackageManifestShape {
    const content = readFileSync(join(this.cwd, PACKAGE_MANIFEST), 'utf-8')

    return JSON.parse(content) as PackageManifestShape
  }

  private readProjectTSConfig(): {
    config: TSConfigShape
    configFileName?: string
    errors: Array<typescript.Diagnostic>
  } {
    const tsconfigPath = join(this.cwd, PROJECT_TS_CONFIG)

    if (!existsSync(tsconfigPath)) {
      return {
        config: {},
        errors: [],
      }
    }

    const result = this.ts.readConfigFile(tsconfigPath, this.ts.sys.readFile)

    if (result.error) {
      return {
        config: {},
        errors: [result.error],
      }
    }

    return {
      config: result.config as TSConfigShape,
      configFileName: tsconfigPath,
      errors: [],
    }
  }
}
