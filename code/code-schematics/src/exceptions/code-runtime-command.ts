export class CodeRuntimeCommandException extends Error {
  constructor(error: string) {
    super(`Code runtime command failed: ${error}`)
  }
}
