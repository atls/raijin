import { RAIJIN_SCAFFOLD_TYPE_USAGE } from './scaffold-type.js'

export class RaijinInitializerScaffoldTypeRequiredException extends Error {
  constructor() {
    super(`Raijin scaffold type is required in non-interactive mode. ${RAIJIN_SCAFFOLD_TYPE_USAGE}`)
    this.name = 'RaijinInitializerScaffoldTypeRequiredException'
  }
}
