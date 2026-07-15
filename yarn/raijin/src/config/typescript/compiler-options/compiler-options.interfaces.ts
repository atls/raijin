import type ts from 'typescript'

export interface ResolveTypeScriptCompilerOptionsOptions {
  readonly filepath: string
  readonly typescript: typeof ts
}
