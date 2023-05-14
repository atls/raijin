import { StreamOutput } from './stream.output';
export class PassThroughRunContext {
    constructor() {
        this.stdoutOutput = new StreamOutput();
        this.stderrOutput = new StreamOutput();
        this.stdout = this.stdoutOutput.stream;
        this.stderr = this.stderrOutput.stream;
    }
    get output() {
        return [this.stdoutOutput.data, this.stderrOutput.data].filter(Boolean).join('\n');
    }
}
