import { EvalWorker } from '@atls/code-worker-utils';
import { getContent } from './service.worker.content';
export class ServiceWorker {
    constructor(cwd, rootCwd) {
        this.cwd = cwd;
        this.rootCwd = rootCwd;
    }
    async run() {
        process.chdir(this.rootCwd);
        return EvalWorker.run(getContent(), {
            cwd: this.cwd,
            environment: 'production',
        });
    }
    async watch(onMessage) {
        process.chdir(this.rootCwd);
        return EvalWorker.watch(getContent(), {
            environment: 'development',
            cwd: this.cwd,
        }, onMessage);
    }
}
