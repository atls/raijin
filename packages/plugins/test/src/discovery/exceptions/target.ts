export class TargetMissingException extends Error {
  constructor(target: string) {
    super(`Test target does not exist: ${target}`)
  }
}
