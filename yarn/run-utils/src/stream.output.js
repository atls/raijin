import { PassThrough } from 'stream';
export class StreamOutput {
    constructor() {
        this.stream = new PassThrough();
        this.chunks = [];
        this.stream.on('data', (chunk) => this.chunks.push(chunk));
    }
    get data() {
        return Buffer.concat(this.chunks).toString();
    }
}
