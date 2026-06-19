import { createRuntimeDigestMismatchMessage } from '../errors.js'

export class RaijinRuntimeDigestMismatchException extends Error {
  constructor(expected: string, actual: string) {
    super(createRuntimeDigestMismatchMessage(expected, actual))
    this.name = 'RaijinRuntimeDigestMismatchException'
  }
}
