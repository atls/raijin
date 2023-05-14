import { EvalWorker } from '@atls/code-worker-utils';
import { getContent } from './tester.worker.content';
export class TesterWorker {
    constructor(cwd) {
        this.cwd = cwd;
    }
    async run(type, options, files) {
        return EvalWorker.run(getContent(), {
            cwd: this.cwd,
            type,
            options,
            files,
        });
    }
}
