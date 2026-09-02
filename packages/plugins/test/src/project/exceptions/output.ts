export class ReporterOutputUnavailableException extends Error {
  constructor() {
    super('Node test reporter output is unavailable')
  }
}
