import { PassThrough } from 'node:stream'

export class StreamOutput {
  public readonly stream = new PassThrough()

  private chunks: Array<Buffer> = []

  constructor() {
    this.stream.on('data', (chunk: Buffer) => this.chunks.push(chunk))
  }

  get data(): string {
    return Buffer.concat(this.chunks).toString()
  }
}
