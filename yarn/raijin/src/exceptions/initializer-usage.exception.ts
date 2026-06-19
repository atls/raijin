import { RAIJIN_INITIALIZER_USAGE_MESSAGE } from '../errors.js'

export class RaijinInitializerUsageException extends Error {
  constructor() {
    super(RAIJIN_INITIALIZER_USAGE_MESSAGE)
    this.name = 'RaijinInitializerUsageException'
  }
}
