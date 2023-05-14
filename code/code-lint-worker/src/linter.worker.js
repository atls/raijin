import { EvalWorker } from '@atls/code-worker-utils';
import { getContent } from './linter.worker.content';
export class LinterWorker {
    constructor(cwd) {
        this.cwd = cwd;
    }
    async run(files = []) {
        return EvalWorker.run(getContent(), {
            cwd: this.cwd,
            files,
        });
    }
}
