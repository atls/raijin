export const RAIJIN_SCAFFOLD_TYPE_USAGE = 'Use --type project or --type library'

export class RaijinInitializerScaffoldTypeException extends Error {
  constructor(scaffoldType: string) {
    super(`Invalid Raijin scaffold type "${scaffoldType}". ${RAIJIN_SCAFFOLD_TYPE_USAGE}`)
    this.name = 'RaijinInitializerScaffoldTypeException'
  }
}
