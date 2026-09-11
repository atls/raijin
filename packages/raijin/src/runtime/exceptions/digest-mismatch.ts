const createRuntimeDigestMismatchMessage = (expected: string, actual: string): string =>
  `Downloaded Raijin runtime digest mismatch: expected ${expected}, got ${actual}`

export class RaijinRuntimeDigestMismatchException extends Error {
  constructor(expected: string, actual: string) {
    super(createRuntimeDigestMismatchMessage(expected, actual))
    this.name = 'RaijinRuntimeDigestMismatchException'
  }
}
