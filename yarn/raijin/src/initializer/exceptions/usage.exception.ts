const RAIJIN_INITIALIZER_USAGE_MESSAGE =
  'Usage: yarn init @atls/raijin or yarn dlx @atls/raijin init'

export class RaijinInitializerUsageException extends Error {
  constructor() {
    super(RAIJIN_INITIALIZER_USAGE_MESSAGE)
    this.name = 'RaijinInitializerUsageException'
  }
}
