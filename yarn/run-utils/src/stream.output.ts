import { PassThrough } from 'stream'

export class StreamOutput {
  public readonly stream = new PassThrough()

  private chunks: Array<Buffer> = []

  constructor() {
    this.stream.on('data', (chunk) => this.chunks.push(chunk))
  }

  get data() {
    return Buffer.concat(this.chunks).toString()
  }
}
