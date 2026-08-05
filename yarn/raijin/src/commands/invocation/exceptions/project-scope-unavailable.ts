export class ProjectScopeUnavailableError extends Error {
  constructor() {
    super('Entry command invocation does not have project execution scope')

    this.name = 'ProjectScopeUnavailableError'
  }
}
