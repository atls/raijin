const RAIJIN_INITIALIZER_USAGE_MESSAGE =
  'Usage: yarn dlx @atls/raijin init --type project|library or yarn dlx @atls/raijin update'

export class RaijinInitializerUsageException extends Error {
  constructor() {
    super(RAIJIN_INITIALIZER_USAGE_MESSAGE)
    this.name = 'RaijinInitializerUsageException'
  }
}
