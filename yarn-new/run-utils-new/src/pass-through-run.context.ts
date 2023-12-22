import { StreamOutput } from './stream.output'

export class PassThroughRunContext {
  private readonly stdoutOutput = new StreamOutput()

  private readonly stderrOutput = new StreamOutput()

  public readonly stdout

  public readonly stderr

  constructor() {
    this.stdout = this.stdoutOutput.stream
    this.stderr = this.stderrOutput.stream
  }

  get output() {
    return [this.stdoutOutput.data, this.stderrOutput.data].filter(Boolean).join('\n')
  }
}
