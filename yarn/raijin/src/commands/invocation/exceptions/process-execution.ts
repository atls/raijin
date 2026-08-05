export class ProcessExecutionError extends Error {
  constructor(command: string) {
    super(`Unable to execute process: ${command}`)

    this.name = 'ProcessExecutionError'
  }
}
