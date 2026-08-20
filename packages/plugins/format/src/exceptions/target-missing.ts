export class TargetMissingException extends Error {
  constructor(readonly target: string) {
    super(`Formatter target does not exist: ${target}`)

    this.name = 'TargetMissingException'
  }
}
