"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.availableParallelism = exports.getCaller = exports.getArchitectureSet = exports.getArchitectureName = exports.getArchitecture = exports.builtinModules = exports.openUrl = void 0;
const tslib_1 = require("tslib");
const fslib_1 = require("@yarnpkg/fslib");
const module_1 = tslib_1.__importDefault(require("module"));
const os_1 = tslib_1.__importDefault(require("os"));
const execUtils = tslib_1.__importStar(require("./execUtils"));
const miscUtils = tslib_1.__importStar(require("./miscUtils"));
const openUrlBinary = new Map([
    [`darwin`, `open`],
    [`linux`, `xdg-open`],
    [`win32`, `explorer.exe`],
]).get(process.platform);
exports.openUrl = typeof openUrlBinary !== `undefined`
    ? async (url) => {
        try {
            await execUtils.execvp(openUrlBinary, [url], { cwd: fslib_1.ppath.cwd() });
            return true;
        }
        catch {
            return false;
        }
    }
    : undefined;
function builtinModules() {
    // @ts-expect-error
    return new Set(module_1.default.builtinModules || Object.keys(process.binding(`natives`)));
}
exports.builtinModules = builtinModules;
function getLibc() {
    var _a, _b, _c, _d;
    // It seems that Node randomly crashes with no output under some circumstances when running a getReport() on Windows.
    // Since Windows has no libc anyway, shortcut this path.
    if (process.platform === `win32`)
        return null;
    const report = (_b = (_a = process.report) === null || _a === void 0 ? void 0 : _a.getReport()) !== null && _b !== void 0 ? _b : {};
    const sharedObjects = (_c = report.sharedObjects) !== null && _c !== void 0 ? _c : [];
    // Matches the first group if libc, second group if musl
    const libcRegExp = /\/(?:(ld-linux-|[^/]+-linux-gnu\/)|(libc.musl-|ld-musl-))/;
    return (_d = miscUtils.mapAndFind(sharedObjects, entry => {
        const match = entry.match(libcRegExp);
        if (!match)
            return miscUtils.mapAndFind.skip;
        if (match[1])
            return `glibc`;
        if (match[2])
            return `musl`;
        throw new Error(`Assertion failed: Expected the libc variant to have been detected`);
    })) !== null && _d !== void 0 ? _d : null;
}
let architecture;
let architectureSet;
function getArchitecture() {
    return architecture = architecture !== null && architecture !== void 0 ? architecture : {
        os: process.platform,
        cpu: process.arch,
        libc: getLibc(),
    };
}
exports.getArchitecture = getArchitecture;
function getArchitectureName(architecture = getArchitecture()) {
    if (architecture.libc) {
        return `${architecture.os}-${architecture.cpu}-${architecture.libc}`;
    }
    else {
        return `${architecture.os}-${architecture.cpu}`;
    }
}
exports.getArchitectureName = getArchitectureName;
function getArchitectureSet() {
    const architecture = getArchitecture();
    return architectureSet = architectureSet !== null && architectureSet !== void 0 ? architectureSet : {
        os: [architecture.os],
        cpu: [architecture.cpu],
        libc: architecture.libc ? [architecture.libc] : [],
    };
}
exports.getArchitectureSet = getArchitectureSet;
const chromeRe = /^\s*at (.*?) ?\(((?:file|https?|blob|chrome-extension|native|eval|webpack|<anonymous>|\/|[a-z]:\\|\\\\).*?)(?::(\d+))?(?::(\d+))?\)?\s*$/i;
const chromeEvalRe = /\((\S*)(?::(\d+))(?::(\d+))\)/;
// https://github.com/errwischt/stacktrace-parser/blob/f70768a12579de3469f3fdfdc423657ee6609c7c/src/stack-trace-parser.js
function parseStackLine(line) {
    const parts = chromeRe.exec(line);
    if (!parts)
        return null;
    const isNative = parts[2] && parts[2].indexOf(`native`) === 0; // start of line
    const isEval = parts[2] && parts[2].indexOf(`eval`) === 0; // start of line
    const submatch = chromeEvalRe.exec(parts[2]);
    if (isEval && submatch != null) {
        // throw out eval line/column and use top-most line/column number
        parts[2] = submatch[1]; // url
        parts[3] = submatch[2]; // line
        parts[4] = submatch[3]; // column
    }
    return {
        file: !isNative ? parts[2] : null,
        methodName: parts[1] || `<unknown>`,
        arguments: isNative ? [parts[2]] : [],
        line: parts[3] ? +parts[3] : null,
        column: parts[4] ? +parts[4] : null,
    };
}
function getCaller() {
    const err = new Error();
    const line = err.stack.split(`\n`)[3];
    return parseStackLine(line);
}
exports.getCaller = getCaller;
function availableParallelism() {
    // TODO: Use os.availableParallelism directly when dropping support for Node.js < 19.4.0
    if (`availableParallelism` in os_1.default)
        // @ts-expect-error - No types yet
        return os_1.default.availableParallelism();
    return Math.max(1, os_1.default.cpus().length);
}
exports.availableParallelism = availableParallelism;
