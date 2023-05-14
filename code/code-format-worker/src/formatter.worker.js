import { EvalWorker } from '@atls/code-worker-utils';
import { getContent } from './formatter.worker.content';
export class FormatterWorker {
    constructor(cwd) {
        this.cwd = cwd;
    }
    async run(files) {
        return EvalWorker.run(getContent(), {
            cwd: this.cwd,
            files,
        });
    }
}
