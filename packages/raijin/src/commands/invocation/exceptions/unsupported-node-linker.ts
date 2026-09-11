export class UnsupportedNodeLinkerError extends Error {
  constructor(nodeLinker: unknown) {
    super(`Raijin commands require Yarn Plug'n'Play; received nodeLinker=${String(nodeLinker)}`)

    this.name = 'UnsupportedNodeLinkerError'
  }
}
