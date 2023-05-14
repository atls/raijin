import { join } from 'node:path';
import { Worker } from 'node:worker_threads';
export class EvalWorker {
    static async run(content, workerData) {
        return new Promise((resolve, reject) => {
            const pnpPath = process.versions.pnp
                ? require('module').findPnpApi(__filename).resolveRequest('pnpapi', null)
                : join(process.cwd(), '.pnp.cjs');
            const worker = new Worker(content, {
                eval: true,
                execArgv: ['--require', pnpPath, ...process.execArgv],
                workerData,
            });
            const exitHandler = (code) => {
                if (code !== 0)
                    reject(new Error(`Worker stopped with exit code ${code}`));
            };
            worker.once('message', (result) => {
                worker.off('error', reject);
                worker.off('exit', exitHandler);
                resolve(result);
            });
            worker.once('error', reject);
            worker.once('exit', exitHandler);
        });
    }
    static async watch(content, workerData, onMessage) {
        return new Promise((resolve, reject) => {
            const pnpPath = process.versions.pnp
                ? require('module').findPnpApi(__filename).resolveRequest('pnpapi', null)
                : join(process.cwd(), '.pnp.cjs');
            const worker = new Worker(content, {
                eval: true,
                execArgv: ['--require', pnpPath, ...process.execArgv],
                workerData,
            });
            const exitHandler = (code) => {
                if (code !== 0) {
                    reject(new Error(`Worker stopped with exit code ${code}`));
                }
                else {
                    resolve(null);
                }
            };
            worker.on('message', onMessage);
            worker.once('error', reject);
            worker.once('exit', exitHandler);
        });
    }
}
