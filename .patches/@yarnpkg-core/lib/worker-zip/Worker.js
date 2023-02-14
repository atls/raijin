"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fslib_1 = require("@yarnpkg/fslib");
const libzip_1 = require("@yarnpkg/libzip");
const worker_threads_1 = require("worker_threads");
const tgzUtils_1 = require("../tgzUtils");
if (!worker_threads_1.parentPort)
    throw new Error(`Assertion failed: Expected parentPort to be set`);
worker_threads_1.parentPort.on(`message`, async (data) => {
    const { opts, tgz, tmpFile } = data;
    const { compressionLevel, ...bufferOpts } = opts;
    const zipFs = new libzip_1.ZipFS(tmpFile, { create: true, level: compressionLevel, stats: fslib_1.statUtils.makeDefaultStats() });
    // Buffers sent through Node are turned into regular Uint8Arrays
    const tgzBuffer = Buffer.from(tgz.buffer, tgz.byteOffset, tgz.byteLength);
    await (0, tgzUtils_1.extractArchiveTo)(tgzBuffer, zipFs, bufferOpts);
    zipFs.saveAndClose();
    worker_threads_1.parentPort.postMessage(data.tmpFile);
});
