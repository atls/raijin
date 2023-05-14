import { parentPort } from 'node:worker_threads';
import { workerData } from 'node:worker_threads';
import { Schematics } from '@atls/code-schematics';
const { type, cwd, force, dryRun, schematicName, migrationVersion, options = {} } = workerData;
const runner = new Schematics(cwd, force, dryRun);
new Promise(async (resolve, reject) => {
    try {
        if (type === 'generate') {
            parentPort.postMessage(await runner.init(schematicName, options));
        }
        if (type === 'migrate') {
            parentPort.postMessage(await runner.migrate(schematicName, migrationVersion, options));
        }
    }
    catch (error) {
        reject(error);
    }
    resolve(null);
});
