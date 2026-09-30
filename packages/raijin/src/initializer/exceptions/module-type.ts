export class RaijinInitializerModuleTypeException extends Error {
  constructor() {
    super('Raijin requires package.json "type" to be "module"')
    this.name = 'RaijinInitializerModuleTypeException'
  }
}
