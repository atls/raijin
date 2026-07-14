export type TypeScriptCompilerOptionsShape = Record<string, unknown>

export type TypeScriptConfigShape = Record<string, unknown> & {
  compilerOptions?: TypeScriptCompilerOptionsShape
  exclude?: unknown
  extends?: unknown
  files?: unknown
  include?: unknown
  references?: unknown
}
