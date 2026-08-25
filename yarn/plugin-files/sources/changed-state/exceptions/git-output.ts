export class GitOutputException extends Error {
  constructor(message: string, cause: unknown) {
    super(message, { cause })
    this.name = 'GitOutputException'
  }
}
