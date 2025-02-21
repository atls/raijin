export class UndefinedBuildRedultException extends Error {
  constructor() {
    super('SchematicFactory build result is undefined')
  }
}
