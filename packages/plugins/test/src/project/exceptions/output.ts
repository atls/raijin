export class OutputUnavailable extends Error {
  constructor() {
    super('Node test reporter output is unavailable')
  }
}
