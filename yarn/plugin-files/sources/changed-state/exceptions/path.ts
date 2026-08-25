export class ChangedPathException extends Error {
  constructor(readonly path: string) {
    super(`Changed path "${path}" is outside the project boundary`, { cause: path })
    this.name = 'ChangedPathException'
  }
}
