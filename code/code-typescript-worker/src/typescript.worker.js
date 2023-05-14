import { EvalWorker } from '@atls/code-worker-utils';
import { getContent } from './typescript.worker.content';
export class TypeScriptWorker {
    constructor(cwd) {
        this.cwd = cwd;
    }
    async check(include) {
        const originalCwd = process.cwd();
        process.chdir(this.cwd);
        return EvalWorker.run(getContent(), {
            cwd: originalCwd,
            type: 'check',
            include,
        });
    }
    async build(include = [], override = {}) {
        const originalCwd = process.cwd();
        process.chdir(this.cwd);
        return EvalWorker.run(getContent(), {
            cwd: originalCwd,
            type: 'build',
            include,
            override,
        });
    }
}
