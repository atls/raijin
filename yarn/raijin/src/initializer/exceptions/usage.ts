const RAIJIN_INITIALIZER_USAGE_MESSAGE =
  'Usage: yarn init @atls/raijin --type project or yarn dlx @atls/raijin init --type project'

export class RaijinInitializerUsageException extends Error {
  constructor() {
    super(RAIJIN_INITIALIZER_USAGE_MESSAGE)
    this.name = 'RaijinInitializerUsageException'
  }
}
