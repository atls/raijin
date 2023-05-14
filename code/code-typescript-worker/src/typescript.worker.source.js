import { parentPort } from 'node:worker_threads';
import { workerData } from 'node:worker_threads';
import { stringify } from 'flatted';
import { parse } from 'flatted';
import { TypeScript } from '@atls/code-typescript';
const { type, cwd, include, override } = workerData;
const ts = new TypeScript(cwd);
if (type === 'check') {
    ts.check(include).then((diagnostics) => parentPort.postMessage(parse(stringify(diagnostics))));
}
else {
    ts.build(include, override).then((diagnostics) => parentPort.postMessage(parse(stringify(diagnostics))));
}
