export class UndefinedBuildResultException extends Error {
  constructor() {
    super('Schematic factory build result is undefined')
  }
}
