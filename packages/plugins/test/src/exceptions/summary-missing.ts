export class SummaryMissingException extends Error {
  constructor() {
    super('Node test runner did not report a final summary')
  }
}
