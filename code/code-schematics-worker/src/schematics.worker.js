import { EvalWorker } from '@atls/code-worker-utils';
import { getContent } from './schematics.worker.content';
export class SchematicsWorker {
    constructor(cwd, force = false, dryRun = false) {
        this.cwd = cwd;
        this.force = force;
        this.dryRun = dryRun;
    }
    generate(schematicName, options = {}) {
        return EvalWorker.run(getContent(), {
            type: 'generate',
            cwd: this.cwd,
            force: this.force,
            dryRun: this.dryRun,
            schematicName,
            options,
        });
    }
    migrate(schematicName, migrationVersion, options = {}) {
        return EvalWorker.run(getContent(), {
            type: 'migrate',
            cwd: this.cwd,
            force: this.force,
            dryRun: this.dryRun,
            migrationVersion,
            schematicName,
            options,
        });
    }
}
