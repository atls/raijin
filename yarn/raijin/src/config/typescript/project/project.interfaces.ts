import type ts from 'typescript'

export type TypeScriptRuntime = typeof ts

export interface TypeScriptProjectSelection {
  readonly kind: 'explicit' | 'fallback'
  readonly patterns: ReadonlyArray<string>
}

export interface ResolveTypeScriptProjectOptions {
  readonly compilerOptions?: Partial<ts.CompilerOptions>
  readonly cwd: string
  readonly manifestCwds?: ReadonlyArray<string>
  readonly selection?: TypeScriptProjectSelection
  readonly typescript: TypeScriptRuntime
}

export interface TypeScriptProjectConfig {
  readonly configFileName?: string
  readonly errors: ReadonlyArray<ts.Diagnostic>
  readonly fileNames: ReadonlyArray<string>
  readonly options: ts.CompilerOptions
  readonly projectReferences?: ReadonlyArray<ts.ProjectReference>
}
