import { createYarnCommandFailureMessage } from '../../errors.js'

export class RaijinYarnCommandException extends Error {
  constructor(args: Array<string>) {
    super(createYarnCommandFailureMessage(args))
    this.name = 'RaijinYarnCommandException'
  }
}
