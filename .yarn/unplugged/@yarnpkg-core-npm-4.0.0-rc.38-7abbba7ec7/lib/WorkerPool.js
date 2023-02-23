"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerPool = void 0;
const tslib_1 = require("tslib");
const p_limit_1 = tslib_1.__importDefault(require("p-limit"));
const worker_threads_1 = require("worker_threads");
const nodeUtils = tslib_1.__importStar(require("./nodeUtils"));
const kTaskInfo = Symbol(`kTaskInfo`);
class WorkerPool {
    constructor(source) {
        this.source = source;
        this.workers = [];
        this.limit = (0, p_limit_1.default)(nodeUtils.availableParallelism());
        this.cleanupInterval = setInterval(() => {
            if (this.limit.pendingCount === 0 && this.limit.activeCount === 0) {
                // Start terminating one worker at a time when there are no tasks left.
                // This allows the pool to scale down without having to re-create the
                // entire pool when there is a short amount of time without tasks.
                const worker = this.workers.pop();
                if (worker) {
                    worker.terminate();
                }
                else {
                    clearInterval(this.cleanupInterval);
                }
            }
        }, 5000).unref();
    }
    createWorker() {
        this.cleanupInterval.refresh();
        const worker = new worker_threads_1.Worker(this.source, {
            eval: true,
            execArgv: [...process.execArgv, `--unhandled-rejections=strict`],
        });
        worker.on(`message`, (result) => {
            if (!worker[kTaskInfo])
                throw new Error(`Assertion failed: Worker sent a result without having a task assigned`);
            worker[kTaskInfo].resolve(result);
            worker[kTaskInfo] = null;
            worker.unref();
            this.workers.push(worker);
        });
        worker.on(`error`, err => {
            var _a;
            (_a = worker[kTaskInfo]) === null || _a === void 0 ? void 0 : _a.reject(err);
            worker[kTaskInfo] = null;
        });
        worker.on(`exit`, code => {
            var _a;
            if (code !== 0)
                (_a = worker[kTaskInfo]) === null || _a === void 0 ? void 0 : _a.reject(new Error(`Worker exited with code ${code}`));
            worker[kTaskInfo] = null;
        });
        return worker;
    }
    run(data) {
        return this.limit(() => {
            var _a;
            const worker = (_a = this.workers.pop()) !== null && _a !== void 0 ? _a : this.createWorker();
            worker.ref();
            return new Promise((resolve, reject) => {
                worker[kTaskInfo] = { resolve, reject };
                worker.postMessage(data);
            });
        });
    }
}
exports.WorkerPool = WorkerPool;
