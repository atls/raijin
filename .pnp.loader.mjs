import require$$0$1, { URL as URL$1, fileURLToPath, pathToFileURL } from 'url';
import fs from 'fs';
import path$1 from 'path';
import moduleExports, { Module, createRequire } from 'module';
import require$$1 from 'util';
import require$$0, { EOL } from 'os';
import require$$2 from 'stream';
import require$$4 from 'zlib';
import require$$1$1 from 'events';
import require$$0$2 from 'readline';
import assert from 'assert';

const [major, minor] = process.versions.node.split(`.`).map((value) => parseInt(value, 10));
const HAS_CONSOLIDATED_HOOKS = major > 16 || major === 16 && minor >= 12;
const HAS_UNFLAGGED_JSON_MODULES = major > 17 || major === 17 && minor >= 5 || major === 16 && minor >= 15;
const HAS_JSON_IMPORT_ASSERTION_REQUIREMENT = major > 17 || major === 17 && minor >= 1 || major === 16 && minor > 14;
const WATCH_MODE_MESSAGE_USES_ARRAYS = major > 19 || major === 19 && minor >= 2 || major === 18 && minor >= 13;

const PortablePath = {
  root: `/`,
  dot: `.`,
  parent: `..`
};
const npath = Object.create(path$1);
const ppath = Object.create(path$1.posix);
npath.cwd = () => process.cwd();
ppath.cwd = () => toPortablePath(process.cwd());
ppath.resolve = (...segments) => {
  if (segments.length > 0 && ppath.isAbsolute(segments[0])) {
    return path$1.posix.resolve(...segments);
  } else {
    return path$1.posix.resolve(ppath.cwd(), ...segments);
  }
};
const contains = function(pathUtils, from, to) {
  from = pathUtils.normalize(from);
  to = pathUtils.normalize(to);
  if (from === to)
    return `.`;
  if (!from.endsWith(pathUtils.sep))
    from = from + pathUtils.sep;
  if (to.startsWith(from)) {
    return to.slice(from.length);
  } else {
    return null;
  }
};
npath.fromPortablePath = fromPortablePath;
npath.toPortablePath = toPortablePath;
npath.contains = (from, to) => contains(npath, from, to);
ppath.contains = (from, to) => contains(ppath, from, to);
const WINDOWS_PATH_REGEXP = /^([a-zA-Z]:.*)$/;
const UNC_WINDOWS_PATH_REGEXP = /^\/\/(\.\/)?(.*)$/;
const PORTABLE_PATH_REGEXP = /^\/([a-zA-Z]:.*)$/;
const UNC_PORTABLE_PATH_REGEXP = /^\/unc\/(\.dot\/)?(.*)$/;
function fromPortablePath(p) {
  if (process.platform !== `win32`)
    return p;
  let portablePathMatch, uncPortablePathMatch;
  if (portablePathMatch = p.match(PORTABLE_PATH_REGEXP))
    p = portablePathMatch[1];
  else if (uncPortablePathMatch = p.match(UNC_PORTABLE_PATH_REGEXP))
    p = `\\\\${uncPortablePathMatch[1] ? `.\\` : ``}${uncPortablePathMatch[2]}`;
  else
    return p;
  return p.replace(/\//g, `\\`);
}
function toPortablePath(p) {
  if (process.platform !== `win32`)
    return p;
  p = p.replace(/\\/g, `/`);
  let windowsPathMatch, uncWindowsPathMatch;
  if (windowsPathMatch = p.match(WINDOWS_PATH_REGEXP))
    p = `/${windowsPathMatch[1]}`;
  else if (uncWindowsPathMatch = p.match(UNC_WINDOWS_PATH_REGEXP))
    p = `/unc/${uncWindowsPathMatch[1] ? `.dot/` : ``}${uncWindowsPathMatch[2]}`;
  return p;
}
function convertPath(targetPathUtils, sourcePath) {
  return targetPathUtils === npath ? fromPortablePath(sourcePath) : toPortablePath(sourcePath);
}

const builtinModules = new Set(Module.builtinModules || Object.keys(process.binding(`natives`)));
const isBuiltinModule = (request) => request.startsWith(`node:`) || builtinModules.has(request);
function readPackageScope(checkPath) {
  const rootSeparatorIndex = checkPath.indexOf(npath.sep);
  let separatorIndex;
  do {
    separatorIndex = checkPath.lastIndexOf(npath.sep);
    checkPath = checkPath.slice(0, separatorIndex);
    if (checkPath.endsWith(`${npath.sep}node_modules`))
      return false;
    const pjson = readPackage(checkPath + npath.sep);
    if (pjson) {
      return {
        data: pjson,
        path: checkPath
      };
    }
  } while (separatorIndex > rootSeparatorIndex);
  return false;
}
function readPackage(requestPath) {
  const jsonPath = npath.resolve(requestPath, `package.json`);
  if (!fs.existsSync(jsonPath))
    return null;
  return JSON.parse(fs.readFileSync(jsonPath, `utf8`));
}

async function tryReadFile$1(path2) {
  try {
    return await fs.promises.readFile(path2, `utf8`);
  } catch (error) {
    if (error.code === `ENOENT`)
      return null;
    throw error;
  }
}
function tryParseURL(str, base) {
  try {
    return new URL$1(str, base);
  } catch {
    return null;
  }
}
let entrypointPath = null;
function setEntrypointPath(file) {
  entrypointPath = file;
}
function getFileFormat$1(filepath) {
  var _a, _b;
  const ext = path$1.extname(filepath);
  switch (ext) {
    case `.mjs`: {
      return `module`;
    }
    case `.cjs`: {
      return `commonjs`;
    }
    case `.wasm`: {
      throw new Error(
        `Unknown file extension ".wasm" for ${filepath}`
      );
    }
    case `.json`: {
      if (HAS_UNFLAGGED_JSON_MODULES)
        return `json`;
      throw new Error(
        `Unknown file extension ".json" for ${filepath}`
      );
    }
    case `.js`: {
      const pkg = readPackageScope(filepath);
      if (!pkg)
        return `commonjs`;
      return (_a = pkg.data.type) != null ? _a : `commonjs`;
    }
    default: {
      if (entrypointPath !== filepath)
        return null;
      const pkg = readPackageScope(filepath);
      if (!pkg)
        return `commonjs`;
      if (pkg.data.type === `module`)
        return null;
      return (_b = pkg.data.type) != null ? _b : `commonjs`;
    }
  }
}

async function getFormat$2(resolved, context, defaultGetFormat) {
  const url = tryParseURL(resolved);
  if ((url == null ? void 0 : url.protocol) !== `file:`)
    return defaultGetFormat(resolved, context, defaultGetFormat);
  const format = getFileFormat$1(fileURLToPath(url));
  if (format) {
    return {
      format
    };
  }
  return defaultGetFormat(resolved, context, defaultGetFormat);
}

const require = createRequire(import.meta.url);
function getFileFormat(filepath) {
  var _a;
  const ext = path$1.extname(filepath);
  switch (ext) {
    case `.mts`: {
      return `module`;
    }
    case `.cts`: {
      return `commonjs`;
    }
    case `.tsx`: {
		const pkg = readPackageScope(filepath);
		if (!pkg)
		  return `commonjs`;
		return (_a = pkg.data.type) != null ? _a : `commonjs`;
	  }
      case `.ts`: {
      
      const pkg = readPackageScope(filepath);
      if (!pkg)
        return `commonjs`;
      return (_a = pkg.data.type) != null ? _a : `commonjs`;
    }
    default: {
      return null;
    }
  }
}
function transformSource(source, format, ext) {
  const { transformSync } = require(`esbuild`);
  const { code } = transformSync(source, {
    format: format === `module` ? `esm` : `cjs`,
    loader: ext === 'tsx' ? 'tsx' : 'ts',
    target: `node${process.versions.node}`
  });
  return code;
}

async function getFormat$1(resolved, context, defaultGetFormat) {
  return await getFormat$2(resolved, context, async (resolved2, context2) => {
    const url = tryParseURL(resolved2);
    if ((url == null ? void 0 : url.protocol) !== `file:`)
      return defaultGetFormat(resolved2, context2, defaultGetFormat);
    const filePath = fileURLToPath(url);
    const format = getFileFormat(filePath);
    if (format) {
      return {
        format
      };
    }
    return defaultGetFormat(resolved2, context2, defaultGetFormat);
  });
}

async function getSource$2(urlString, context, defaultGetSource) {
  const url = tryParseURL(urlString);
  if ((url == null ? void 0 : url.protocol) !== `file:`)
    return defaultGetSource(urlString, context, defaultGetSource);
  return {
    source: await fs.promises.readFile(fileURLToPath(url), `utf8`)
  };
}

async function getSource$1(urlString, context, defaultGetSource) {
  const result = await getSource$2(urlString, context, defaultGetSource);
  const url = tryParseURL(urlString);
  if ((url == null ? void 0 : url.protocol) !== `file:`)
    return defaultGetSource(urlString, context, defaultGetSource);
  return {
    source: transformSource(result.source, context.format, urlString.includes('.tsx') ? 'tsx' : 'ts')
  };
}

var lib = {};

/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */

var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
};

function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
}

var __assign = function() {
    __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};

function __rest(s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
}

function __decorate(decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
}

function __param(paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
}

function __metadata(metadataKey, metadataValue) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
}

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function __generator(thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
}

function __createBinding(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}

function __exportStar(m, exports) {
    for (var p in m) if (p !== "default" && !exports.hasOwnProperty(p)) exports[p] = m[p];
}

function __values(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
}

function __read(o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
}

function __spread() {
    for (var ar = [], i = 0; i < arguments.length; i++)
        ar = ar.concat(__read(arguments[i]));
    return ar;
}

function __spreadArrays() {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
}
function __await(v) {
    return this instanceof __await ? (this.v = v, this) : new __await(v);
}

function __asyncGenerator(thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
}

function __asyncDelegator(o) {
    var i, p;
    return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
    function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
}

function __asyncValues(o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
}

function __makeTemplateObject(cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
}
function __importStar(mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result.default = mod;
    return result;
}

function __importDefault(mod) {
    return (mod && mod.__esModule) ? mod : { default: mod };
}

function __classPrivateFieldGet(receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
}

function __classPrivateFieldSet(receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
}

const tslib_es6 = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  get __assign () { return __assign; },
  __asyncDelegator,
  __asyncGenerator,
  __asyncValues,
  __await,
  __awaiter,
  __classPrivateFieldGet,
  __classPrivateFieldSet,
  __createBinding,
  __decorate,
  __exportStar,
  __extends,
  __generator,
  __importDefault,
  __importStar,
  __makeTemplateObject,
  __metadata,
  __param,
  __read,
  __rest,
  __spread,
  __spreadArrays,
  __values
}, Symbol.toStringTag, { value: 'Module' }));

var constants = {};

var hasRequiredConstants;

function requireConstants () {
	if (hasRequiredConstants) return constants;
	hasRequiredConstants = 1;
	Object.defineProperty(constants, "__esModule", { value: true });
	constants.SAFE_TIME = constants.S_IFLNK = constants.S_IFREG = constants.S_IFDIR = constants.S_IFMT = void 0;
	constants.S_IFMT = 0o170000;
	constants.S_IFDIR = 0o040000;
	constants.S_IFREG = 0o100000;
	constants.S_IFLNK = 0o120000;
	/**
	 * Unix timestamp for `1984-06-22T21:50:00.000Z`
	 *
	 * It needs to be after 1980-01-01 because that's what Zip supports, and it
	 * needs to have a slight offset to account for different timezones (because
	 * zip assumes that all times are local to whoever writes the file, which is
	 * really silly).
	 */
	constants.SAFE_TIME = 456789000;
	return constants;
}

var statUtils = {};

var hasRequiredStatUtils;

function requireStatUtils () {
	if (hasRequiredStatUtils) return statUtils;
	hasRequiredStatUtils = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.areStatsEqual = exports.convertToBigIntStats = exports.clearStats = exports.makeEmptyStats = exports.makeDefaultStats = exports.BigIntStatsEntry = exports.StatEntry = exports.DirEntry = exports.DEFAULT_MODE = void 0;
		const tslib_1 = tslib_es6;
		const nodeUtils = tslib_1.__importStar(require$$1);
		const constants_1 = requireConstants();
		exports.DEFAULT_MODE = constants_1.S_IFREG | 0o644;
		class DirEntry {
		    constructor() {
		        this.name = ``;
		        this.mode = 0;
		    }
		    isBlockDevice() {
		        return false;
		    }
		    isCharacterDevice() {
		        return false;
		    }
		    isDirectory() {
		        return (this.mode & constants_1.S_IFMT) === constants_1.S_IFDIR;
		    }
		    isFIFO() {
		        return false;
		    }
		    isFile() {
		        return (this.mode & constants_1.S_IFMT) === constants_1.S_IFREG;
		    }
		    isSocket() {
		        return false;
		    }
		    isSymbolicLink() {
		        return (this.mode & constants_1.S_IFMT) === constants_1.S_IFLNK;
		    }
		}
		exports.DirEntry = DirEntry;
		class StatEntry {
		    constructor() {
		        this.uid = 0;
		        this.gid = 0;
		        this.size = 0;
		        this.blksize = 0;
		        this.atimeMs = 0;
		        this.mtimeMs = 0;
		        this.ctimeMs = 0;
		        this.birthtimeMs = 0;
		        this.atime = new Date(0);
		        this.mtime = new Date(0);
		        this.ctime = new Date(0);
		        this.birthtime = new Date(0);
		        this.dev = 0;
		        this.ino = 0;
		        this.mode = exports.DEFAULT_MODE;
		        this.nlink = 1;
		        this.rdev = 0;
		        this.blocks = 1;
		    }
		    isBlockDevice() {
		        return false;
		    }
		    isCharacterDevice() {
		        return false;
		    }
		    isDirectory() {
		        return (this.mode & constants_1.S_IFMT) === constants_1.S_IFDIR;
		    }
		    isFIFO() {
		        return false;
		    }
		    isFile() {
		        return (this.mode & constants_1.S_IFMT) === constants_1.S_IFREG;
		    }
		    isSocket() {
		        return false;
		    }
		    isSymbolicLink() {
		        return (this.mode & constants_1.S_IFMT) === constants_1.S_IFLNK;
		    }
		}
		exports.StatEntry = StatEntry;
		class BigIntStatsEntry {
		    constructor() {
		        this.uid = BigInt(0);
		        this.gid = BigInt(0);
		        this.size = BigInt(0);
		        this.blksize = BigInt(0);
		        this.atimeMs = BigInt(0);
		        this.mtimeMs = BigInt(0);
		        this.ctimeMs = BigInt(0);
		        this.birthtimeMs = BigInt(0);
		        this.atimeNs = BigInt(0);
		        this.mtimeNs = BigInt(0);
		        this.ctimeNs = BigInt(0);
		        this.birthtimeNs = BigInt(0);
		        this.atime = new Date(0);
		        this.mtime = new Date(0);
		        this.ctime = new Date(0);
		        this.birthtime = new Date(0);
		        this.dev = BigInt(0);
		        this.ino = BigInt(0);
		        this.mode = BigInt(exports.DEFAULT_MODE);
		        this.nlink = BigInt(1);
		        this.rdev = BigInt(0);
		        this.blocks = BigInt(1);
		    }
		    isBlockDevice() {
		        return false;
		    }
		    isCharacterDevice() {
		        return false;
		    }
		    isDirectory() {
		        return (this.mode & BigInt(constants_1.S_IFMT)) === BigInt(constants_1.S_IFDIR);
		    }
		    isFIFO() {
		        return false;
		    }
		    isFile() {
		        return (this.mode & BigInt(constants_1.S_IFMT)) === BigInt(constants_1.S_IFREG);
		    }
		    isSocket() {
		        return false;
		    }
		    isSymbolicLink() {
		        return (this.mode & BigInt(constants_1.S_IFMT)) === BigInt(constants_1.S_IFLNK);
		    }
		}
		exports.BigIntStatsEntry = BigIntStatsEntry;
		function makeDefaultStats() {
		    return new StatEntry();
		}
		exports.makeDefaultStats = makeDefaultStats;
		function makeEmptyStats() {
		    return clearStats(makeDefaultStats());
		}
		exports.makeEmptyStats = makeEmptyStats;
		/**
		 * Mutates the provided stats object to zero it out then returns it for convenience
		 */
		function clearStats(stats) {
		    for (const key in stats) {
		        if (Object.prototype.hasOwnProperty.call(stats, key)) {
		            const element = stats[key];
		            if (typeof element === `number`) {
		                // @ts-expect-error Typescript can't tell that stats[key] is a number
		                stats[key] = 0;
		            }
		            else if (typeof element === `bigint`) {
		                // @ts-expect-error Typescript can't tell that stats[key] is a bigint
		                stats[key] = BigInt(0);
		            }
		            else if (nodeUtils.types.isDate(element)) {
		                // @ts-expect-error Typescript can't tell that stats[key] is a bigint
		                stats[key] = new Date(0);
		            }
		        }
		    }
		    return stats;
		}
		exports.clearStats = clearStats;
		function convertToBigIntStats(stats) {
		    const bigintStats = new BigIntStatsEntry();
		    for (const key in stats) {
		        if (Object.prototype.hasOwnProperty.call(stats, key)) {
		            const element = stats[key];
		            if (typeof element === `number`) {
		                // @ts-expect-error Typescript isn't able to tell this is valid
		                bigintStats[key] = BigInt(element);
		            }
		            else if (nodeUtils.types.isDate(element)) {
		                // @ts-expect-error Typescript isn't able to tell this is valid
		                bigintStats[key] = new Date(element);
		            }
		        }
		    }
		    bigintStats.atimeNs = bigintStats.atimeMs * BigInt(1e6);
		    bigintStats.mtimeNs = bigintStats.mtimeMs * BigInt(1e6);
		    bigintStats.ctimeNs = bigintStats.ctimeMs * BigInt(1e6);
		    bigintStats.birthtimeNs = bigintStats.birthtimeMs * BigInt(1e6);
		    return bigintStats;
		}
		exports.convertToBigIntStats = convertToBigIntStats;
		function areStatsEqual(a, b) {
		    if (a.atimeMs !== b.atimeMs)
		        return false;
		    if (a.birthtimeMs !== b.birthtimeMs)
		        return false;
		    if (a.blksize !== b.blksize)
		        return false;
		    if (a.blocks !== b.blocks)
		        return false;
		    if (a.ctimeMs !== b.ctimeMs)
		        return false;
		    if (a.dev !== b.dev)
		        return false;
		    if (a.gid !== b.gid)
		        return false;
		    if (a.ino !== b.ino)
		        return false;
		    if (a.isBlockDevice() !== b.isBlockDevice())
		        return false;
		    if (a.isCharacterDevice() !== b.isCharacterDevice())
		        return false;
		    if (a.isDirectory() !== b.isDirectory())
		        return false;
		    if (a.isFIFO() !== b.isFIFO())
		        return false;
		    if (a.isFile() !== b.isFile())
		        return false;
		    if (a.isSocket() !== b.isSocket())
		        return false;
		    if (a.isSymbolicLink() !== b.isSymbolicLink())
		        return false;
		    if (a.mode !== b.mode)
		        return false;
		    if (a.mtimeMs !== b.mtimeMs)
		        return false;
		    if (a.nlink !== b.nlink)
		        return false;
		    if (a.rdev !== b.rdev)
		        return false;
		    if (a.size !== b.size)
		        return false;
		    if (a.uid !== b.uid)
		        return false;
		    const aN = a;
		    const bN = b;
		    if (aN.atimeNs !== bN.atimeNs)
		        return false;
		    if (aN.mtimeNs !== bN.mtimeNs)
		        return false;
		    if (aN.ctimeNs !== bN.ctimeNs)
		        return false;
		    if (aN.birthtimeNs !== bN.birthtimeNs)
		        return false;
		    return true;
		}
		exports.areStatsEqual = areStatsEqual;
} (statUtils));
	return statUtils;
}

var copyPromise$1 = {};

var path = {};

var hasRequiredPath;

function requirePath () {
	if (hasRequiredPath) return path;
	hasRequiredPath = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.toFilename = exports.convertPath = exports.ppath = exports.npath = exports.Filename = exports.PortablePath = void 0;
		const tslib_1 = tslib_es6;
		const path_1 = tslib_1.__importDefault(path$1);
		var PathType;
		(function (PathType) {
		    PathType[PathType["File"] = 0] = "File";
		    PathType[PathType["Portable"] = 1] = "Portable";
		    PathType[PathType["Native"] = 2] = "Native";
		})(PathType || (PathType = {}));
		exports.PortablePath = {
		    root: `/`,
		    dot: `.`,
		    parent: `..`,
		};
		exports.Filename = {
		    nodeModules: `node_modules`,
		    manifest: `package.json`,
		    lockfile: `yarn.lock`,
		    virtual: `__virtual__`,
		    /**
		     * @deprecated
		     */
		    pnpJs: `.pnp.js`,
		    pnpCjs: `.pnp.cjs`,
		    rc: `.yarnrc.yml`,
		};
		exports.npath = Object.create(path_1.default);
		exports.ppath = Object.create(path_1.default.posix);
		exports.npath.cwd = () => process.cwd();
		exports.ppath.cwd = () => toPortablePath(process.cwd());
		exports.ppath.resolve = (...segments) => {
		    if (segments.length > 0 && exports.ppath.isAbsolute(segments[0])) {
		        return path_1.default.posix.resolve(...segments);
		    }
		    else {
		        return path_1.default.posix.resolve(exports.ppath.cwd(), ...segments);
		    }
		};
		const contains = function (pathUtils, from, to) {
		    from = pathUtils.normalize(from);
		    to = pathUtils.normalize(to);
		    if (from === to)
		        return `.`;
		    if (!from.endsWith(pathUtils.sep))
		        from = (from + pathUtils.sep);
		    if (to.startsWith(from)) {
		        return to.slice(from.length);
		    }
		    else {
		        return null;
		    }
		};
		exports.npath.fromPortablePath = fromPortablePath;
		exports.npath.toPortablePath = toPortablePath;
		exports.npath.contains = (from, to) => contains(exports.npath, from, to);
		exports.ppath.contains = (from, to) => contains(exports.ppath, from, to);
		const WINDOWS_PATH_REGEXP = /^([a-zA-Z]:.*)$/;
		const UNC_WINDOWS_PATH_REGEXP = /^\/\/(\.\/)?(.*)$/;
		const PORTABLE_PATH_REGEXP = /^\/([a-zA-Z]:.*)$/;
		const UNC_PORTABLE_PATH_REGEXP = /^\/unc\/(\.dot\/)?(.*)$/;
		// Path should look like "/N:/berry/scripts/plugin-pack.js"
		// And transform to "N:\berry\scripts\plugin-pack.js"
		function fromPortablePath(p) {
		    if (process.platform !== `win32`)
		        return p;
		    let portablePathMatch, uncPortablePathMatch;
		    if ((portablePathMatch = p.match(PORTABLE_PATH_REGEXP)))
		        p = portablePathMatch[1];
		    else if ((uncPortablePathMatch = p.match(UNC_PORTABLE_PATH_REGEXP)))
		        p = `\\\\${uncPortablePathMatch[1] ? `.\\` : ``}${uncPortablePathMatch[2]}`;
		    else
		        return p;
		    return p.replace(/\//g, `\\`);
		}
		// Path should look like "N:/berry/scripts/plugin-pack.js"
		// And transform to "/N:/berry/scripts/plugin-pack.js"
		function toPortablePath(p) {
		    if (process.platform !== `win32`)
		        return p;
		    p = p.replace(/\\/g, `/`);
		    let windowsPathMatch, uncWindowsPathMatch;
		    if ((windowsPathMatch = p.match(WINDOWS_PATH_REGEXP)))
		        p = `/${windowsPathMatch[1]}`;
		    else if ((uncWindowsPathMatch = p.match(UNC_WINDOWS_PATH_REGEXP)))
		        p = `/unc/${uncWindowsPathMatch[1] ? `.dot/` : ``}${uncWindowsPathMatch[2]}`;
		    return p;
		}
		function convertPath(targetPathUtils, sourcePath) {
		    return (targetPathUtils === exports.npath ? fromPortablePath(sourcePath) : toPortablePath(sourcePath));
		}
		exports.convertPath = convertPath;
		function toFilename(filename) {
		    if (exports.npath.parse(filename).dir !== `` || exports.ppath.parse(filename).dir !== ``)
		        throw new Error(`Invalid filename: "${filename}"`);
		    return filename;
		}
		exports.toFilename = toFilename;
} (path));
	return path;
}

var hasRequiredCopyPromise;

function requireCopyPromise () {
	if (hasRequiredCopyPromise) return copyPromise$1;
	hasRequiredCopyPromise = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.copyPromise = exports.LinkStrategy = void 0;
		const tslib_1 = tslib_es6;
		const fs_1 = tslib_1.__importDefault(fs);
		const constants = tslib_1.__importStar(requireConstants());
		const path_1 = requirePath();
		const defaultTime = new Date(constants.SAFE_TIME * 1000);
		var LinkStrategy;
		(function (LinkStrategy) {
		    LinkStrategy["Allow"] = "allow";
		    LinkStrategy["ReadOnly"] = "readOnly";
		})(LinkStrategy = exports.LinkStrategy || (exports.LinkStrategy = {}));
		async function copyPromise(destinationFs, destination, sourceFs, source, opts) {
		    const normalizedDestination = destinationFs.pathUtils.normalize(destination);
		    const normalizedSource = sourceFs.pathUtils.normalize(source);
		    const prelayout = [];
		    const postlayout = [];
		    const { atime, mtime } = opts.stableTime
		        ? { atime: defaultTime, mtime: defaultTime }
		        : await sourceFs.lstatPromise(normalizedSource);
		    await destinationFs.mkdirpPromise(destinationFs.pathUtils.dirname(destination), { utimes: [atime, mtime] });
		    const updateTime = typeof destinationFs.lutimesPromise === `function`
		        ? destinationFs.lutimesPromise.bind(destinationFs)
		        : destinationFs.utimesPromise.bind(destinationFs);
		    await copyImpl(prelayout, postlayout, updateTime, destinationFs, normalizedDestination, sourceFs, normalizedSource, { ...opts, didParentExist: true });
		    for (const operation of prelayout)
		        await operation();
		    await Promise.all(postlayout.map(operation => {
		        return operation();
		    }));
		}
		exports.copyPromise = copyPromise;
		async function copyImpl(prelayout, postlayout, updateTime, destinationFs, destination, sourceFs, source, opts) {
		    var _a, _b;
		    const destinationStat = opts.didParentExist ? await maybeLStat(destinationFs, destination) : null;
		    const sourceStat = await sourceFs.lstatPromise(source);
		    const { atime, mtime } = opts.stableTime
		        ? { atime: defaultTime, mtime: defaultTime }
		        : sourceStat;
		    let updated;
		    switch (true) {
		        case sourceStat.isDirectory():
		            {
		                updated = await copyFolder(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
		            }
		            break;
		        case sourceStat.isFile():
		            {
		                updated = await copyFile(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
		            }
		            break;
		        case sourceStat.isSymbolicLink():
		            {
		                updated = await copySymlink(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
		            }
		            break;
		        default:
		            {
		                throw new Error(`Unsupported file type (${sourceStat.mode})`);
		            }
		    }
		    if (updated || ((_a = destinationStat === null || destinationStat === void 0 ? void 0 : destinationStat.mtime) === null || _a === void 0 ? void 0 : _a.getTime()) !== mtime.getTime() || ((_b = destinationStat === null || destinationStat === void 0 ? void 0 : destinationStat.atime) === null || _b === void 0 ? void 0 : _b.getTime()) !== atime.getTime()) {
		        postlayout.push(() => updateTime(destination, atime, mtime));
		        updated = true;
		    }
		    if (destinationStat === null || (destinationStat.mode & 0o777) !== (sourceStat.mode & 0o777)) {
		        postlayout.push(() => destinationFs.chmodPromise(destination, sourceStat.mode & 0o777));
		        updated = true;
		    }
		    return updated;
		}
		async function maybeLStat(baseFs, p) {
		    try {
		        return await baseFs.lstatPromise(p);
		    }
		    catch (e) {
		        return null;
		    }
		}
		async function copyFolder(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
		    if (destinationStat !== null && !destinationStat.isDirectory()) {
		        if (opts.overwrite) {
		            prelayout.push(async () => destinationFs.removePromise(destination));
		            destinationStat = null;
		        }
		        else {
		            return false;
		        }
		    }
		    let updated = false;
		    if (destinationStat === null) {
		        prelayout.push(async () => {
		            try {
		                await destinationFs.mkdirPromise(destination, { mode: sourceStat.mode });
		            }
		            catch (err) {
		                if (err.code !== `EEXIST`) {
		                    throw err;
		                }
		            }
		        });
		        updated = true;
		    }
		    const entries = await sourceFs.readdirPromise(source);
		    const nextOpts = opts.didParentExist && !destinationStat ? { ...opts, didParentExist: false } : opts;
		    if (opts.stableSort) {
		        for (const entry of entries.sort()) {
		            if (await copyImpl(prelayout, postlayout, updateTime, destinationFs, destinationFs.pathUtils.join(destination, entry), sourceFs, sourceFs.pathUtils.join(source, entry), nextOpts)) {
		                updated = true;
		            }
		        }
		    }
		    else {
		        const entriesUpdateStatus = await Promise.all(entries.map(async (entry) => {
		            await copyImpl(prelayout, postlayout, updateTime, destinationFs, destinationFs.pathUtils.join(destination, entry), sourceFs, sourceFs.pathUtils.join(source, entry), nextOpts);
		        }));
		        if (entriesUpdateStatus.some(status => status)) {
		            updated = true;
		        }
		    }
		    return updated;
		}
		const isCloneSupportedCache = new WeakMap();
		function makeLinkOperation(opFs, destination, source, sourceStat, linkStrategy) {
		    return async () => {
		        await opFs.linkPromise(source, destination);
		        if (linkStrategy === LinkStrategy.ReadOnly) {
		            // We mutate the stat, otherwise it'll be reset by copyImpl
		            sourceStat.mode &= ~0o222;
		            await opFs.chmodPromise(destination, sourceStat.mode);
		        }
		    };
		}
		function makeCloneLinkOperation(opFs, destination, source, sourceStat, linkStrategy) {
		    const isCloneSupported = isCloneSupportedCache.get(opFs);
		    if (typeof isCloneSupported === `undefined`) {
		        return async () => {
		            try {
		                await opFs.copyFilePromise(source, destination, fs_1.default.constants.COPYFILE_FICLONE_FORCE);
		                isCloneSupportedCache.set(opFs, true);
		            }
		            catch (err) {
		                if (err.code === `ENOSYS` || err.code === `ENOTSUP`) {
		                    isCloneSupportedCache.set(opFs, false);
		                    await makeLinkOperation(opFs, destination, source, sourceStat, linkStrategy)();
		                }
		                else {
		                    throw err;
		                }
		            }
		        };
		    }
		    else {
		        if (isCloneSupported) {
		            return async () => opFs.copyFilePromise(source, destination, fs_1.default.constants.COPYFILE_FICLONE_FORCE);
		        }
		        else {
		            return makeLinkOperation(opFs, destination, source, sourceStat, linkStrategy);
		        }
		    }
		}
		async function copyFile(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
		    var _a;
		    if (destinationStat !== null) {
		        if (opts.overwrite) {
		            prelayout.push(async () => destinationFs.removePromise(destination));
		            destinationStat = null;
		        }
		        else {
		            return false;
		        }
		    }
		    const linkStrategy = (_a = opts.linkStrategy) !== null && _a !== void 0 ? _a : null;
		    const op = destinationFs === sourceFs
		        ? linkStrategy !== null
		            ? makeCloneLinkOperation(destinationFs, destination, source, sourceStat, linkStrategy)
		            : async () => destinationFs.copyFilePromise(source, destination, fs_1.default.constants.COPYFILE_FICLONE)
		        : linkStrategy !== null
		            ? makeLinkOperation(destinationFs, destination, source, sourceStat, linkStrategy)
		            : async () => destinationFs.writeFilePromise(destination, await sourceFs.readFilePromise(source));
		    prelayout.push(async () => op());
		    return true;
		}
		async function copySymlink(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
		    if (destinationStat !== null) {
		        if (opts.overwrite) {
		            prelayout.push(async () => destinationFs.removePromise(destination));
		            destinationStat = null;
		        }
		        else {
		            return false;
		        }
		    }
		    prelayout.push(async () => {
		        await destinationFs.symlinkPromise((0, path_1.convertPath)(destinationFs.pathUtils, await sourceFs.readlinkPromise(source)), destination);
		    });
		    return true;
		}
} (copyPromise$1));
	return copyPromise$1;
}

var opendir = {};

var errors = {};

var hasRequiredErrors;

function requireErrors () {
	if (hasRequiredErrors) return errors;
	hasRequiredErrors = 1;
	Object.defineProperty(errors, "__esModule", { value: true });
	errors.LibzipError = errors.ERR_DIR_CLOSED = errors.EOPNOTSUPP = errors.ENOTEMPTY = errors.EROFS = errors.EEXIST = errors.EISDIR = errors.ENOTDIR = errors.ENOENT = errors.EBADF = errors.EINVAL = errors.ENOSYS = errors.EBUSY = void 0;
	function makeError(code, message) {
	    return Object.assign(new Error(`${code}: ${message}`), { code });
	}
	function EBUSY(message) {
	    return makeError(`EBUSY`, message);
	}
	errors.EBUSY = EBUSY;
	function ENOSYS(message, reason) {
	    return makeError(`ENOSYS`, `${message}, ${reason}`);
	}
	errors.ENOSYS = ENOSYS;
	function EINVAL(reason) {
	    return makeError(`EINVAL`, `invalid argument, ${reason}`);
	}
	errors.EINVAL = EINVAL;
	function EBADF(reason) {
	    return makeError(`EBADF`, `bad file descriptor, ${reason}`);
	}
	errors.EBADF = EBADF;
	function ENOENT(reason) {
	    return makeError(`ENOENT`, `no such file or directory, ${reason}`);
	}
	errors.ENOENT = ENOENT;
	function ENOTDIR(reason) {
	    return makeError(`ENOTDIR`, `not a directory, ${reason}`);
	}
	errors.ENOTDIR = ENOTDIR;
	function EISDIR(reason) {
	    return makeError(`EISDIR`, `illegal operation on a directory, ${reason}`);
	}
	errors.EISDIR = EISDIR;
	function EEXIST(reason) {
	    return makeError(`EEXIST`, `file already exists, ${reason}`);
	}
	errors.EEXIST = EEXIST;
	function EROFS(reason) {
	    return makeError(`EROFS`, `read-only filesystem, ${reason}`);
	}
	errors.EROFS = EROFS;
	function ENOTEMPTY(reason) {
	    return makeError(`ENOTEMPTY`, `directory not empty, ${reason}`);
	}
	errors.ENOTEMPTY = ENOTEMPTY;
	function EOPNOTSUPP(reason) {
	    return makeError(`EOPNOTSUPP`, `operation not supported, ${reason}`);
	}
	errors.EOPNOTSUPP = EOPNOTSUPP;
	// ------------------------------------------------------------------------
	function ERR_DIR_CLOSED() {
	    return makeError(`ERR_DIR_CLOSED`, `Directory handle was closed`);
	}
	errors.ERR_DIR_CLOSED = ERR_DIR_CLOSED;
	// ------------------------------------------------------------------------
	class LibzipError extends Error {
	    constructor(message, code) {
	        super(message);
	        this.name = `Libzip Error`;
	        this.code = code;
	    }
	}
	errors.LibzipError = LibzipError;
	return errors;
}

var hasRequiredOpendir;

function requireOpendir () {
	if (hasRequiredOpendir) return opendir;
	hasRequiredOpendir = 1;
	Object.defineProperty(opendir, "__esModule", { value: true });
	opendir.opendir = opendir.CustomDir = void 0;
	const tslib_1 = tslib_es6;
	const errors = tslib_1.__importStar(requireErrors());
	class CustomDir {
	    constructor(path, nextDirent, opts = {}) {
	        this.path = path;
	        this.nextDirent = nextDirent;
	        this.opts = opts;
	        this.closed = false;
	    }
	    throwIfClosed() {
	        if (this.closed) {
	            throw errors.ERR_DIR_CLOSED();
	        }
	    }
	    async *[Symbol.asyncIterator]() {
	        try {
	            let dirent;
	            // eslint-disable-next-line no-cond-assign
	            while ((dirent = await this.read()) !== null) {
	                yield dirent;
	            }
	        }
	        finally {
	            await this.close();
	        }
	    }
	    read(cb) {
	        const dirent = this.readSync();
	        if (typeof cb !== `undefined`)
	            return cb(null, dirent);
	        return Promise.resolve(dirent);
	    }
	    readSync() {
	        this.throwIfClosed();
	        return this.nextDirent();
	    }
	    close(cb) {
	        this.closeSync();
	        if (typeof cb !== `undefined`)
	            return cb(null);
	        return Promise.resolve();
	    }
	    closeSync() {
	        var _a, _b;
	        this.throwIfClosed();
	        (_b = (_a = this.opts).onClose) === null || _b === void 0 ? void 0 : _b.call(_a);
	        this.closed = true;
	    }
	}
	opendir.CustomDir = CustomDir;
	function opendir$1(fakeFs, path, entries, opts) {
	    const nextDirent = () => {
	        const filename = entries.shift();
	        if (typeof filename === `undefined`)
	            return null;
	        return Object.assign(fakeFs.statSync(fakeFs.pathUtils.join(path, filename)), {
	            name: filename,
	        });
	    };
	    return new CustomDir(path, nextDirent, opts);
	}
	opendir.opendir = opendir$1;
	return opendir;
}

var FakeFS$1 = {};

var hasRequiredFakeFS;

function requireFakeFS () {
	if (hasRequiredFakeFS) return FakeFS$1;
	hasRequiredFakeFS = 1;
	Object.defineProperty(FakeFS$1, "__esModule", { value: true });
	FakeFS$1.normalizeLineEndings = FakeFS$1.BasePortableFakeFS = FakeFS$1.FakeFS = void 0;
	const os_1 = require$$0;
	const copyPromise_1 = requireCopyPromise();
	const path_1 = requirePath();
	class FakeFS {
	    constructor(pathUtils) {
	        this.pathUtils = pathUtils;
	    }
	    async *genTraversePromise(init, { stableSort = false } = {}) {
	        const stack = [init];
	        while (stack.length > 0) {
	            const p = stack.shift();
	            const entry = await this.lstatPromise(p);
	            if (entry.isDirectory()) {
	                const entries = await this.readdirPromise(p);
	                if (stableSort) {
	                    for (const entry of entries.sort()) {
	                        stack.push(this.pathUtils.join(p, entry));
	                    }
	                }
	                else {
	                    throw new Error(`Not supported`);
	                }
	            }
	            else {
	                yield p;
	            }
	        }
	    }
	    async removePromise(p, { recursive = true, maxRetries = 5 } = {}) {
	        let stat;
	        try {
	            stat = await this.lstatPromise(p);
	        }
	        catch (error) {
	            if (error.code === `ENOENT`) {
	                return;
	            }
	            else {
	                throw error;
	            }
	        }
	        if (stat.isDirectory()) {
	            if (recursive) {
	                const entries = await this.readdirPromise(p);
	                await Promise.all(entries.map(entry => {
	                    return this.removePromise(this.pathUtils.resolve(p, entry));
	                }));
	            }
	            // 5 gives 1s worth of retries at worst
	            for (let t = 0; t <= maxRetries; t++) {
	                try {
	                    await this.rmdirPromise(p);
	                    break;
	                }
	                catch (error) {
	                    if (error.code !== `EBUSY` && error.code !== `ENOTEMPTY`) {
	                        throw error;
	                    }
	                    else if (t < maxRetries) {
	                        await new Promise(resolve => setTimeout(resolve, t * 100));
	                    }
	                }
	            }
	        }
	        else {
	            await this.unlinkPromise(p);
	        }
	    }
	    removeSync(p, { recursive = true } = {}) {
	        let stat;
	        try {
	            stat = this.lstatSync(p);
	        }
	        catch (error) {
	            if (error.code === `ENOENT`) {
	                return;
	            }
	            else {
	                throw error;
	            }
	        }
	        if (stat.isDirectory()) {
	            if (recursive)
	                for (const entry of this.readdirSync(p))
	                    this.removeSync(this.pathUtils.resolve(p, entry));
	            this.rmdirSync(p);
	        }
	        else {
	            this.unlinkSync(p);
	        }
	    }
	    async mkdirpPromise(p, { chmod, utimes } = {}) {
	        p = this.resolve(p);
	        if (p === this.pathUtils.dirname(p))
	            return undefined;
	        const parts = p.split(this.pathUtils.sep);
	        let createdDirectory;
	        for (let u = 2; u <= parts.length; ++u) {
	            const subPath = parts.slice(0, u).join(this.pathUtils.sep);
	            if (!this.existsSync(subPath)) {
	                try {
	                    await this.mkdirPromise(subPath);
	                }
	                catch (error) {
	                    if (error.code === `EEXIST`) {
	                        continue;
	                    }
	                    else {
	                        throw error;
	                    }
	                }
	                createdDirectory !== null && createdDirectory !== void 0 ? createdDirectory : (createdDirectory = subPath);
	                if (chmod != null)
	                    await this.chmodPromise(subPath, chmod);
	                if (utimes != null) {
	                    await this.utimesPromise(subPath, utimes[0], utimes[1]);
	                }
	                else {
	                    const parentStat = await this.statPromise(this.pathUtils.dirname(subPath));
	                    await this.utimesPromise(subPath, parentStat.atime, parentStat.mtime);
	                }
	            }
	        }
	        return createdDirectory;
	    }
	    mkdirpSync(p, { chmod, utimes } = {}) {
	        p = this.resolve(p);
	        if (p === this.pathUtils.dirname(p))
	            return undefined;
	        const parts = p.split(this.pathUtils.sep);
	        let createdDirectory;
	        for (let u = 2; u <= parts.length; ++u) {
	            const subPath = parts.slice(0, u).join(this.pathUtils.sep);
	            if (!this.existsSync(subPath)) {
	                try {
	                    this.mkdirSync(subPath);
	                }
	                catch (error) {
	                    if (error.code === `EEXIST`) {
	                        continue;
	                    }
	                    else {
	                        throw error;
	                    }
	                }
	                createdDirectory !== null && createdDirectory !== void 0 ? createdDirectory : (createdDirectory = subPath);
	                if (chmod != null)
	                    this.chmodSync(subPath, chmod);
	                if (utimes != null) {
	                    this.utimesSync(subPath, utimes[0], utimes[1]);
	                }
	                else {
	                    const parentStat = this.statSync(this.pathUtils.dirname(subPath));
	                    this.utimesSync(subPath, parentStat.atime, parentStat.mtime);
	                }
	            }
	        }
	        return createdDirectory;
	    }
	    async copyPromise(destination, source, { baseFs = this, overwrite = true, stableSort = false, stableTime = false, linkStrategy = null } = {}) {
	        return await (0, copyPromise_1.copyPromise)(this, destination, baseFs, source, { overwrite, stableSort, stableTime, linkStrategy });
	    }
	    copySync(destination, source, { baseFs = this, overwrite = true } = {}) {
	        const stat = baseFs.lstatSync(source);
	        const exists = this.existsSync(destination);
	        if (stat.isDirectory()) {
	            this.mkdirpSync(destination);
	            const directoryListing = baseFs.readdirSync(source);
	            for (const entry of directoryListing) {
	                this.copySync(this.pathUtils.join(destination, entry), baseFs.pathUtils.join(source, entry), { baseFs, overwrite });
	            }
	        }
	        else if (stat.isFile()) {
	            if (!exists || overwrite) {
	                if (exists)
	                    this.removeSync(destination);
	                const content = baseFs.readFileSync(source);
	                this.writeFileSync(destination, content);
	            }
	        }
	        else if (stat.isSymbolicLink()) {
	            if (!exists || overwrite) {
	                if (exists)
	                    this.removeSync(destination);
	                const target = baseFs.readlinkSync(source);
	                this.symlinkSync((0, path_1.convertPath)(this.pathUtils, target), destination);
	            }
	        }
	        else {
	            throw new Error(`Unsupported file type (file: ${source}, mode: 0o${stat.mode.toString(8).padStart(6, `0`)})`);
	        }
	        const mode = stat.mode & 0o777;
	        this.chmodSync(destination, mode);
	    }
	    async changeFilePromise(p, content, opts = {}) {
	        if (Buffer.isBuffer(content)) {
	            return this.changeFileBufferPromise(p, content, opts);
	        }
	        else {
	            return this.changeFileTextPromise(p, content, opts);
	        }
	    }
	    async changeFileBufferPromise(p, content, { mode } = {}) {
	        let current = Buffer.alloc(0);
	        try {
	            current = await this.readFilePromise(p);
	        }
	        catch (error) {
	            // ignore errors, no big deal
	        }
	        if (Buffer.compare(current, content) === 0)
	            return;
	        await this.writeFilePromise(p, content, { mode });
	    }
	    async changeFileTextPromise(p, content, { automaticNewlines, mode } = {}) {
	        let current = ``;
	        try {
	            current = await this.readFilePromise(p, `utf8`);
	        }
	        catch (error) {
	            // ignore errors, no big deal
	        }
	        const normalizedContent = automaticNewlines
	            ? normalizeLineEndings(current, content)
	            : content;
	        if (current === normalizedContent)
	            return;
	        await this.writeFilePromise(p, normalizedContent, { mode });
	    }
	    changeFileSync(p, content, opts = {}) {
	        if (Buffer.isBuffer(content)) {
	            return this.changeFileBufferSync(p, content, opts);
	        }
	        else {
	            return this.changeFileTextSync(p, content, opts);
	        }
	    }
	    changeFileBufferSync(p, content, { mode } = {}) {
	        let current = Buffer.alloc(0);
	        try {
	            current = this.readFileSync(p);
	        }
	        catch (error) {
	            // ignore errors, no big deal
	        }
	        if (Buffer.compare(current, content) === 0)
	            return;
	        this.writeFileSync(p, content, { mode });
	    }
	    changeFileTextSync(p, content, { automaticNewlines = false, mode } = {}) {
	        let current = ``;
	        try {
	            current = this.readFileSync(p, `utf8`);
	        }
	        catch (error) {
	            // ignore errors, no big deal
	        }
	        const normalizedContent = automaticNewlines
	            ? normalizeLineEndings(current, content)
	            : content;
	        if (current === normalizedContent)
	            return;
	        this.writeFileSync(p, normalizedContent, { mode });
	    }
	    async movePromise(fromP, toP) {
	        try {
	            await this.renamePromise(fromP, toP);
	        }
	        catch (error) {
	            if (error.code === `EXDEV`) {
	                await this.copyPromise(toP, fromP);
	                await this.removePromise(fromP);
	            }
	            else {
	                throw error;
	            }
	        }
	    }
	    moveSync(fromP, toP) {
	        try {
	            this.renameSync(fromP, toP);
	        }
	        catch (error) {
	            if (error.code === `EXDEV`) {
	                this.copySync(toP, fromP);
	                this.removeSync(fromP);
	            }
	            else {
	                throw error;
	            }
	        }
	    }
	    async lockPromise(affectedPath, callback) {
	        const lockPath = `${affectedPath}.flock`;
	        const interval = 1000 / 60;
	        const startTime = Date.now();
	        let fd = null;
	        // Even when we detect that a lock file exists, we still look inside to see
	        // whether the pid that created it is still alive. It's not foolproof
	        // (there are false positive), but there are no false negative and that's
	        // all that matters in 99% of the cases.
	        const isAlive = async () => {
	            let pid;
	            try {
	                ([pid] = await this.readJsonPromise(lockPath));
	            }
	            catch (error) {
	                // If we can't read the file repeatedly, we assume the process was
	                // aborted before even writing finishing writing the payload.
	                return Date.now() - startTime < 500;
	            }
	            try {
	                // "As a special case, a signal of 0 can be used to test for the
	                // existence of a process" - so we check whether it's alive.
	                process.kill(pid, 0);
	                return true;
	            }
	            catch (error) {
	                return false;
	            }
	        };
	        while (fd === null) {
	            try {
	                fd = await this.openPromise(lockPath, `wx`);
	            }
	            catch (error) {
	                if (error.code === `EEXIST`) {
	                    if (!await isAlive()) {
	                        try {
	                            await this.unlinkPromise(lockPath);
	                            continue;
	                        }
	                        catch (error) {
	                            // No big deal if we can't remove it. Just fallback to wait for
	                            // it to be eventually released by its owner.
	                        }
	                    }
	                    if (Date.now() - startTime < 60 * 1000) {
	                        await new Promise(resolve => setTimeout(resolve, interval));
	                    }
	                    else {
	                        throw new Error(`Couldn't acquire a lock in a reasonable time (via ${lockPath})`);
	                    }
	                }
	                else {
	                    throw error;
	                }
	            }
	        }
	        await this.writePromise(fd, JSON.stringify([process.pid]));
	        try {
	            return await callback();
	        }
	        finally {
	            try {
	                // closePromise needs to come before unlinkPromise otherwise another process can attempt
	                // to get the file handle after the unlink but before close resuling in
	                // EPERM: operation not permitted, open
	                await this.closePromise(fd);
	                await this.unlinkPromise(lockPath);
	            }
	            catch (error) {
	                // noop
	            }
	        }
	    }
	    async readJsonPromise(p) {
	        const content = await this.readFilePromise(p, `utf8`);
	        try {
	            return JSON.parse(content);
	        }
	        catch (error) {
	            error.message += ` (in ${p})`;
	            throw error;
	        }
	    }
	    readJsonSync(p) {
	        const content = this.readFileSync(p, `utf8`);
	        try {
	            return JSON.parse(content);
	        }
	        catch (error) {
	            error.message += ` (in ${p})`;
	            throw error;
	        }
	    }
	    async writeJsonPromise(p, data) {
	        return await this.writeFilePromise(p, `${JSON.stringify(data, null, 2)}\n`);
	    }
	    writeJsonSync(p, data) {
	        return this.writeFileSync(p, `${JSON.stringify(data, null, 2)}\n`);
	    }
	    async preserveTimePromise(p, cb) {
	        const stat = await this.lstatPromise(p);
	        const result = await cb();
	        if (typeof result !== `undefined`)
	            p = result;
	        if (this.lutimesPromise) {
	            await this.lutimesPromise(p, stat.atime, stat.mtime);
	        }
	        else if (!stat.isSymbolicLink()) {
	            await this.utimesPromise(p, stat.atime, stat.mtime);
	        }
	    }
	    async preserveTimeSync(p, cb) {
	        const stat = this.lstatSync(p);
	        const result = cb();
	        if (typeof result !== `undefined`)
	            p = result;
	        if (this.lutimesSync) {
	            this.lutimesSync(p, stat.atime, stat.mtime);
	        }
	        else if (!stat.isSymbolicLink()) {
	            this.utimesSync(p, stat.atime, stat.mtime);
	        }
	    }
	}
	FakeFS$1.FakeFS = FakeFS;
	class BasePortableFakeFS extends FakeFS {
	    constructor() {
	        super(path_1.ppath);
	    }
	}
	FakeFS$1.BasePortableFakeFS = BasePortableFakeFS;
	function getEndOfLine(content) {
	    const matches = content.match(/\r?\n/g);
	    if (matches === null)
	        return os_1.EOL;
	    const crlf = matches.filter(nl => nl === `\r\n`).length;
	    const lf = matches.length - crlf;
	    return crlf > lf ? `\r\n` : `\n`;
	}
	function normalizeLineEndings(originalContent, newContent) {
	    return newContent.replace(/\r?\n/g, getEndOfLine(originalContent));
	}
	FakeFS$1.normalizeLineEndings = normalizeLineEndings;
	return FakeFS$1;
}

var ZipFS = {};

var NodeFS$1 = {};

var hasRequiredNodeFS;

function requireNodeFS () {
	if (hasRequiredNodeFS) return NodeFS$1;
	hasRequiredNodeFS = 1;
	Object.defineProperty(NodeFS$1, "__esModule", { value: true });
	NodeFS$1.NodeFS = void 0;
	const tslib_1 = tslib_es6;
	const fs_1 = tslib_1.__importDefault(fs);
	const FakeFS_1 = requireFakeFS();
	const errors_1 = requireErrors();
	const path_1 = requirePath();
	class NodeFS extends FakeFS_1.BasePortableFakeFS {
	    constructor(realFs = fs_1.default) {
	        super();
	        this.realFs = realFs;
	        // @ts-expect-error
	        if (typeof this.realFs.lutimes !== `undefined`) {
	            this.lutimesPromise = this.lutimesPromiseImpl;
	            this.lutimesSync = this.lutimesSyncImpl;
	        }
	    }
	    getExtractHint() {
	        return false;
	    }
	    getRealPath() {
	        return path_1.PortablePath.root;
	    }
	    resolve(p) {
	        return path_1.ppath.resolve(p);
	    }
	    async openPromise(p, flags, mode) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.open(path_1.npath.fromPortablePath(p), flags, mode, this.makeCallback(resolve, reject));
	        });
	    }
	    openSync(p, flags, mode) {
	        return this.realFs.openSync(path_1.npath.fromPortablePath(p), flags, mode);
	    }
	    async opendirPromise(p, opts) {
	        return await new Promise((resolve, reject) => {
	            if (typeof opts !== `undefined`) {
	                this.realFs.opendir(path_1.npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
	            }
	            else {
	                this.realFs.opendir(path_1.npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	            }
	        }).then(dir => {
	            return Object.defineProperty(dir, `path`, { value: p, configurable: true, writable: true });
	        });
	    }
	    opendirSync(p, opts) {
	        const dir = typeof opts !== `undefined`
	            ? this.realFs.opendirSync(path_1.npath.fromPortablePath(p), opts)
	            : this.realFs.opendirSync(path_1.npath.fromPortablePath(p));
	        return Object.defineProperty(dir, `path`, { value: p, configurable: true, writable: true });
	    }
	    async readPromise(fd, buffer, offset = 0, length = 0, position = -1) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.read(fd, buffer, offset, length, position, (error, bytesRead) => {
	                if (error) {
	                    reject(error);
	                }
	                else {
	                    resolve(bytesRead);
	                }
	            });
	        });
	    }
	    readSync(fd, buffer, offset, length, position) {
	        return this.realFs.readSync(fd, buffer, offset, length, position);
	    }
	    async writePromise(fd, buffer, offset, length, position) {
	        return await new Promise((resolve, reject) => {
	            if (typeof buffer === `string`) {
	                return this.realFs.write(fd, buffer, offset, this.makeCallback(resolve, reject));
	            }
	            else {
	                return this.realFs.write(fd, buffer, offset, length, position, this.makeCallback(resolve, reject));
	            }
	        });
	    }
	    writeSync(fd, buffer, offset, length, position) {
	        if (typeof buffer === `string`) {
	            return this.realFs.writeSync(fd, buffer, offset);
	        }
	        else {
	            return this.realFs.writeSync(fd, buffer, offset, length, position);
	        }
	    }
	    async closePromise(fd) {
	        await new Promise((resolve, reject) => {
	            this.realFs.close(fd, this.makeCallback(resolve, reject));
	        });
	    }
	    closeSync(fd) {
	        this.realFs.closeSync(fd);
	    }
	    createReadStream(p, opts) {
	        const realPath = (p !== null ? path_1.npath.fromPortablePath(p) : p);
	        return this.realFs.createReadStream(realPath, opts);
	    }
	    createWriteStream(p, opts) {
	        const realPath = (p !== null ? path_1.npath.fromPortablePath(p) : p);
	        return this.realFs.createWriteStream(realPath, opts);
	    }
	    async realpathPromise(p) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.realpath(path_1.npath.fromPortablePath(p), {}, this.makeCallback(resolve, reject));
	        }).then(path => {
	            return path_1.npath.toPortablePath(path);
	        });
	    }
	    realpathSync(p) {
	        return path_1.npath.toPortablePath(this.realFs.realpathSync(path_1.npath.fromPortablePath(p), {}));
	    }
	    async existsPromise(p) {
	        return await new Promise(resolve => {
	            this.realFs.exists(path_1.npath.fromPortablePath(p), resolve);
	        });
	    }
	    accessSync(p, mode) {
	        return this.realFs.accessSync(path_1.npath.fromPortablePath(p), mode);
	    }
	    async accessPromise(p, mode) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.access(path_1.npath.fromPortablePath(p), mode, this.makeCallback(resolve, reject));
	        });
	    }
	    existsSync(p) {
	        return this.realFs.existsSync(path_1.npath.fromPortablePath(p));
	    }
	    async statPromise(p, opts) {
	        return await new Promise((resolve, reject) => {
	            if (opts) {
	                // @ts-expect-error The node types are out of date
	                this.realFs.stat(path_1.npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
	            }
	            else {
	                this.realFs.stat(path_1.npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	            }
	        });
	    }
	    statSync(p, opts) {
	        if (opts) {
	            // @ts-expect-error The node types are out of date
	            return this.realFs.statSync(path_1.npath.fromPortablePath(p), opts);
	        }
	        else {
	            return this.realFs.statSync(path_1.npath.fromPortablePath(p));
	        }
	    }
	    async fstatPromise(fd, opts) {
	        return await new Promise((resolve, reject) => {
	            if (opts) {
	                // @ts-expect-error - The node typings doesn't know about the options
	                this.realFs.fstat(fd, opts, this.makeCallback(resolve, reject));
	            }
	            else {
	                this.realFs.fstat(fd, this.makeCallback(resolve, reject));
	            }
	        });
	    }
	    fstatSync(fd, opts) {
	        if (opts) {
	            // @ts-expect-error - The node typings doesn't know about the options
	            return this.realFs.fstatSync(fd, opts);
	        }
	        else {
	            return this.realFs.fstatSync(fd);
	        }
	    }
	    async lstatPromise(p, opts) {
	        return await new Promise((resolve, reject) => {
	            if (opts) {
	                // @ts-expect-error - TS does not know this takes options
	                this.realFs.lstat(path_1.npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
	            }
	            else {
	                this.realFs.lstat(path_1.npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	            }
	        });
	    }
	    lstatSync(p, opts) {
	        if (opts) {
	            // @ts-expect-error - TS does not know this takes options
	            return this.realFs.lstatSync(path_1.npath.fromPortablePath(p), opts);
	        }
	        else {
	            return this.realFs.lstatSync(path_1.npath.fromPortablePath(p));
	        }
	    }
	    async fchmodPromise(fd, mask) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.fchmod(fd, mask, this.makeCallback(resolve, reject));
	        });
	    }
	    fchmodSync(fd, mask) {
	        return this.realFs.fchmodSync(fd, mask);
	    }
	    async chmodPromise(p, mask) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.chmod(path_1.npath.fromPortablePath(p), mask, this.makeCallback(resolve, reject));
	        });
	    }
	    chmodSync(p, mask) {
	        return this.realFs.chmodSync(path_1.npath.fromPortablePath(p), mask);
	    }
	    async fchownPromise(fd, uid, gid) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.fchown(fd, uid, gid, this.makeCallback(resolve, reject));
	        });
	    }
	    fchownSync(fd, uid, gid) {
	        return this.realFs.fchownSync(fd, uid, gid);
	    }
	    async chownPromise(p, uid, gid) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.chown(path_1.npath.fromPortablePath(p), uid, gid, this.makeCallback(resolve, reject));
	        });
	    }
	    chownSync(p, uid, gid) {
	        return this.realFs.chownSync(path_1.npath.fromPortablePath(p), uid, gid);
	    }
	    async renamePromise(oldP, newP) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.rename(path_1.npath.fromPortablePath(oldP), path_1.npath.fromPortablePath(newP), this.makeCallback(resolve, reject));
	        });
	    }
	    renameSync(oldP, newP) {
	        return this.realFs.renameSync(path_1.npath.fromPortablePath(oldP), path_1.npath.fromPortablePath(newP));
	    }
	    async copyFilePromise(sourceP, destP, flags = 0) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.copyFile(path_1.npath.fromPortablePath(sourceP), path_1.npath.fromPortablePath(destP), flags, this.makeCallback(resolve, reject));
	        });
	    }
	    copyFileSync(sourceP, destP, flags = 0) {
	        return this.realFs.copyFileSync(path_1.npath.fromPortablePath(sourceP), path_1.npath.fromPortablePath(destP), flags);
	    }
	    async appendFilePromise(p, content, opts) {
	        return await new Promise((resolve, reject) => {
	            const fsNativePath = typeof p === `string` ? path_1.npath.fromPortablePath(p) : p;
	            if (opts) {
	                this.realFs.appendFile(fsNativePath, content, opts, this.makeCallback(resolve, reject));
	            }
	            else {
	                this.realFs.appendFile(fsNativePath, content, this.makeCallback(resolve, reject));
	            }
	        });
	    }
	    appendFileSync(p, content, opts) {
	        const fsNativePath = typeof p === `string` ? path_1.npath.fromPortablePath(p) : p;
	        if (opts) {
	            this.realFs.appendFileSync(fsNativePath, content, opts);
	        }
	        else {
	            this.realFs.appendFileSync(fsNativePath, content);
	        }
	    }
	    async writeFilePromise(p, content, opts) {
	        return await new Promise((resolve, reject) => {
	            const fsNativePath = typeof p === `string` ? path_1.npath.fromPortablePath(p) : p;
	            if (opts) {
	                this.realFs.writeFile(fsNativePath, content, opts, this.makeCallback(resolve, reject));
	            }
	            else {
	                this.realFs.writeFile(fsNativePath, content, this.makeCallback(resolve, reject));
	            }
	        });
	    }
	    writeFileSync(p, content, opts) {
	        const fsNativePath = typeof p === `string` ? path_1.npath.fromPortablePath(p) : p;
	        if (opts) {
	            this.realFs.writeFileSync(fsNativePath, content, opts);
	        }
	        else {
	            this.realFs.writeFileSync(fsNativePath, content);
	        }
	    }
	    async unlinkPromise(p) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.unlink(path_1.npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	        });
	    }
	    unlinkSync(p) {
	        return this.realFs.unlinkSync(path_1.npath.fromPortablePath(p));
	    }
	    async utimesPromise(p, atime, mtime) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.utimes(path_1.npath.fromPortablePath(p), atime, mtime, this.makeCallback(resolve, reject));
	        });
	    }
	    utimesSync(p, atime, mtime) {
	        this.realFs.utimesSync(path_1.npath.fromPortablePath(p), atime, mtime);
	    }
	    async lutimesPromiseImpl(p, atime, mtime) {
	        // @ts-expect-error: Not yet in DefinitelyTyped
	        const lutimes = this.realFs.lutimes;
	        if (typeof lutimes === `undefined`)
	            throw (0, errors_1.ENOSYS)(`unavailable Node binding`, `lutimes '${p}'`);
	        return await new Promise((resolve, reject) => {
	            lutimes.call(this.realFs, path_1.npath.fromPortablePath(p), atime, mtime, this.makeCallback(resolve, reject));
	        });
	    }
	    lutimesSyncImpl(p, atime, mtime) {
	        // @ts-expect-error: Not yet in DefinitelyTyped
	        const lutimesSync = this.realFs.lutimesSync;
	        if (typeof lutimesSync === `undefined`)
	            throw (0, errors_1.ENOSYS)(`unavailable Node binding`, `lutimes '${p}'`);
	        lutimesSync.call(this.realFs, path_1.npath.fromPortablePath(p), atime, mtime);
	    }
	    async mkdirPromise(p, opts) {
	        return await new Promise((resolve, reject) => {
	            // @ts-expect-error - Types are outdated, the second argument in the callback is either a string or undefined
	            this.realFs.mkdir(path_1.npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
	        });
	    }
	    mkdirSync(p, opts) {
	        // @ts-expect-error - Types are outdated, returns either a string or undefined
	        return this.realFs.mkdirSync(path_1.npath.fromPortablePath(p), opts);
	    }
	    async rmdirPromise(p, opts) {
	        return await new Promise((resolve, reject) => {
	            // TODO: always pass opts when min node version is 12.10+
	            if (opts) {
	                this.realFs.rmdir(path_1.npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
	            }
	            else {
	                this.realFs.rmdir(path_1.npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	            }
	        });
	    }
	    rmdirSync(p, opts) {
	        return this.realFs.rmdirSync(path_1.npath.fromPortablePath(p), opts);
	    }
	    async linkPromise(existingP, newP) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.link(path_1.npath.fromPortablePath(existingP), path_1.npath.fromPortablePath(newP), this.makeCallback(resolve, reject));
	        });
	    }
	    linkSync(existingP, newP) {
	        return this.realFs.linkSync(path_1.npath.fromPortablePath(existingP), path_1.npath.fromPortablePath(newP));
	    }
	    async symlinkPromise(target, p, type) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.symlink(path_1.npath.fromPortablePath(target.replace(/\/+$/, ``)), path_1.npath.fromPortablePath(p), type, this.makeCallback(resolve, reject));
	        });
	    }
	    symlinkSync(target, p, type) {
	        return this.realFs.symlinkSync(path_1.npath.fromPortablePath(target.replace(/\/+$/, ``)), path_1.npath.fromPortablePath(p), type);
	    }
	    async readFilePromise(p, encoding) {
	        return await new Promise((resolve, reject) => {
	            const fsNativePath = typeof p === `string` ? path_1.npath.fromPortablePath(p) : p;
	            this.realFs.readFile(fsNativePath, encoding, this.makeCallback(resolve, reject));
	        });
	    }
	    readFileSync(p, encoding) {
	        const fsNativePath = typeof p === `string` ? path_1.npath.fromPortablePath(p) : p;
	        return this.realFs.readFileSync(fsNativePath, encoding);
	    }
	    async readdirPromise(p, opts) {
	        return await new Promise((resolve, reject) => {
	            if (opts === null || opts === void 0 ? void 0 : opts.withFileTypes) {
	                this.realFs.readdir(path_1.npath.fromPortablePath(p), { withFileTypes: true }, this.makeCallback(resolve, reject));
	            }
	            else {
	                this.realFs.readdir(path_1.npath.fromPortablePath(p), this.makeCallback(value => resolve(value), reject));
	            }
	        });
	    }
	    readdirSync(p, opts) {
	        if (opts === null || opts === void 0 ? void 0 : opts.withFileTypes) {
	            return this.realFs.readdirSync(path_1.npath.fromPortablePath(p), { withFileTypes: true });
	        }
	        else {
	            return this.realFs.readdirSync(path_1.npath.fromPortablePath(p));
	        }
	    }
	    async readlinkPromise(p) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.readlink(path_1.npath.fromPortablePath(p), this.makeCallback(resolve, reject));
	        }).then(path => {
	            return path_1.npath.toPortablePath(path);
	        });
	    }
	    readlinkSync(p) {
	        return path_1.npath.toPortablePath(this.realFs.readlinkSync(path_1.npath.fromPortablePath(p)));
	    }
	    async truncatePromise(p, len) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.truncate(path_1.npath.fromPortablePath(p), len, this.makeCallback(resolve, reject));
	        });
	    }
	    truncateSync(p, len) {
	        return this.realFs.truncateSync(path_1.npath.fromPortablePath(p), len);
	    }
	    async ftruncatePromise(fd, len) {
	        return await new Promise((resolve, reject) => {
	            this.realFs.ftruncate(fd, len, this.makeCallback(resolve, reject));
	        });
	    }
	    ftruncateSync(fd, len) {
	        return this.realFs.ftruncateSync(fd, len);
	    }
	    watch(p, a, b) {
	        return this.realFs.watch(path_1.npath.fromPortablePath(p), 
	        // @ts-expect-error
	        a, b);
	    }
	    watchFile(p, a, b) {
	        return this.realFs.watchFile(path_1.npath.fromPortablePath(p), 
	        // @ts-expect-error
	        a, b);
	    }
	    unwatchFile(p, cb) {
	        return this.realFs.unwatchFile(path_1.npath.fromPortablePath(p), cb);
	    }
	    makeCallback(resolve, reject) {
	        return (err, result) => {
	            if (err) {
	                reject(err);
	            }
	            else {
	                resolve(result);
	            }
	        };
	    }
	}
	NodeFS$1.NodeFS = NodeFS;
	return NodeFS$1;
}

var watchFile = {};

var CustomStatWatcher = {};

var hasRequiredCustomStatWatcher;

function requireCustomStatWatcher () {
	if (hasRequiredCustomStatWatcher) return CustomStatWatcher;
	hasRequiredCustomStatWatcher = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.CustomStatWatcher = exports.assertStatus = exports.Status = exports.Event = void 0;
		const tslib_1 = tslib_es6;
		const events_1 = require$$1$1;
		const statUtils = tslib_1.__importStar(requireStatUtils());
		var Event;
		(function (Event) {
		    Event["Change"] = "change";
		    Event["Stop"] = "stop";
		})(Event = exports.Event || (exports.Event = {}));
		var Status;
		(function (Status) {
		    Status["Ready"] = "ready";
		    Status["Running"] = "running";
		    Status["Stopped"] = "stopped";
		})(Status = exports.Status || (exports.Status = {}));
		function assertStatus(current, expected) {
		    if (current !== expected) {
		        throw new Error(`Invalid StatWatcher status: expected '${expected}', got '${current}'`);
		    }
		}
		exports.assertStatus = assertStatus;
		class CustomStatWatcher extends events_1.EventEmitter {
		    static create(fakeFs, path, opts) {
		        const statWatcher = new CustomStatWatcher(fakeFs, path, opts);
		        statWatcher.start();
		        return statWatcher;
		    }
		    constructor(fakeFs, path, { bigint = false } = {}) {
		        super();
		        this.status = Status.Ready;
		        this.changeListeners = new Map();
		        this.startTimeout = null;
		        this.fakeFs = fakeFs;
		        this.path = path;
		        this.bigint = bigint;
		        this.lastStats = this.stat();
		    }
		    start() {
		        assertStatus(this.status, Status.Ready);
		        this.status = Status.Running;
		        // Node allows other listeners to be registered up to 3 milliseconds
		        // after the watcher has been started, so that's what we're doing too
		        this.startTimeout = setTimeout(() => {
		            this.startTimeout = null;
		            // Per the Node FS docs:
		            // "When an fs.watchFile operation results in an ENOENT error,
		            // it will invoke the listener once, with all the fields zeroed
		            // (or, for dates, the Unix Epoch)."
		            if (!this.fakeFs.existsSync(this.path)) {
		                this.emit(Event.Change, this.lastStats, this.lastStats);
		            }
		        }, 3);
		    }
		    stop() {
		        assertStatus(this.status, Status.Running);
		        this.status = Status.Stopped;
		        if (this.startTimeout !== null) {
		            clearTimeout(this.startTimeout);
		            this.startTimeout = null;
		        }
		        this.emit(Event.Stop);
		    }
		    stat() {
		        try {
		            return this.fakeFs.statSync(this.path, { bigint: this.bigint });
		        }
		        catch (error) {
		            // From observation, all errors seem to be mostly ignored by Node.
		            // Checked with ENOENT, ENOTDIR, EPERM
		            const statInstance = this.bigint
		                ? new statUtils.BigIntStatsEntry()
		                : new statUtils.StatEntry();
		            return statUtils.clearStats(statInstance);
		        }
		    }
		    /**
		     * Creates an interval whose callback compares the current stats with the previous stats and notifies all listeners in case of changes.
		     *
		     * @param opts.persistent Decides whether the interval should be immediately unref-ed.
		     */
		    makeInterval(opts) {
		        const interval = setInterval(() => {
		            const currentStats = this.stat();
		            const previousStats = this.lastStats;
		            if (statUtils.areStatsEqual(currentStats, previousStats))
		                return;
		            this.lastStats = currentStats;
		            this.emit(Event.Change, currentStats, previousStats);
		        }, opts.interval);
		        return opts.persistent ? interval : interval.unref();
		    }
		    /**
		     * Registers a listener and assigns it an interval.
		     */
		    registerChangeListener(listener, opts) {
		        this.addListener(Event.Change, listener);
		        this.changeListeners.set(listener, this.makeInterval(opts));
		    }
		    /**
		     * Unregisters the listener and clears the assigned interval.
		     */
		    unregisterChangeListener(listener) {
		        this.removeListener(Event.Change, listener);
		        const interval = this.changeListeners.get(listener);
		        if (typeof interval !== `undefined`)
		            clearInterval(interval);
		        this.changeListeners.delete(listener);
		    }
		    /**
		     * Unregisters all listeners and clears all assigned intervals.
		     */
		    unregisterAllChangeListeners() {
		        for (const listener of this.changeListeners.keys()) {
		            this.unregisterChangeListener(listener);
		        }
		    }
		    hasChangeListeners() {
		        return this.changeListeners.size > 0;
		    }
		    /**
		     * Refs all stored intervals.
		     */
		    ref() {
		        for (const interval of this.changeListeners.values())
		            interval.ref();
		        return this;
		    }
		    /**
		     * Unrefs all stored intervals.
		     */
		    unref() {
		        for (const interval of this.changeListeners.values())
		            interval.unref();
		        return this;
		    }
		}
		exports.CustomStatWatcher = CustomStatWatcher;
} (CustomStatWatcher));
	return CustomStatWatcher;
}

var hasRequiredWatchFile;

function requireWatchFile () {
	if (hasRequiredWatchFile) return watchFile;
	hasRequiredWatchFile = 1;
	Object.defineProperty(watchFile, "__esModule", { value: true });
	watchFile.unwatchAllFiles = watchFile.unwatchFile = watchFile.watchFile = void 0;
	const CustomStatWatcher_1 = requireCustomStatWatcher();
	const statWatchersByFakeFS = new WeakMap();
	function watchFile$1(fakeFs, path, a, b) {
	    let bigint;
	    let persistent;
	    let interval;
	    let listener;
	    switch (typeof a) {
	        case `function`:
	            {
	                bigint = false;
	                persistent = true;
	                interval = 5007;
	                listener = a;
	            }
	            break;
	        default:
	            {
	                ({
	                    bigint = false,
	                    persistent = true,
	                    interval = 5007,
	                } = a);
	                listener = b;
	            }
	            break;
	    }
	    let statWatchers = statWatchersByFakeFS.get(fakeFs);
	    if (typeof statWatchers === `undefined`)
	        statWatchersByFakeFS.set(fakeFs, statWatchers = new Map());
	    let statWatcher = statWatchers.get(path);
	    if (typeof statWatcher === `undefined`) {
	        statWatcher = CustomStatWatcher_1.CustomStatWatcher.create(fakeFs, path, { bigint });
	        statWatchers.set(path, statWatcher);
	    }
	    statWatcher.registerChangeListener(listener, { persistent, interval });
	    return statWatcher;
	}
	watchFile.watchFile = watchFile$1;
	function unwatchFile(fakeFs, path, cb) {
	    const statWatchers = statWatchersByFakeFS.get(fakeFs);
	    if (typeof statWatchers === `undefined`)
	        return;
	    const statWatcher = statWatchers.get(path);
	    if (typeof statWatcher === `undefined`)
	        return;
	    if (typeof cb === `undefined`)
	        statWatcher.unregisterAllChangeListeners();
	    else
	        statWatcher.unregisterChangeListener(cb);
	    if (!statWatcher.hasChangeListeners()) {
	        statWatcher.stop();
	        statWatchers.delete(path);
	    }
	}
	watchFile.unwatchFile = unwatchFile;
	function unwatchAllFiles(fakeFs) {
	    const statWatchers = statWatchersByFakeFS.get(fakeFs);
	    if (typeof statWatchers === `undefined`)
	        return;
	    for (const path of statWatchers.keys()) {
	        unwatchFile(fakeFs, path);
	    }
	}
	watchFile.unwatchAllFiles = unwatchAllFiles;
	return watchFile;
}

var hasRequiredZipFS;

function requireZipFS () {
	if (hasRequiredZipFS) return ZipFS;
	hasRequiredZipFS = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.ZipFS = exports.makeEmptyArchive = exports.DEFAULT_COMPRESSION_LEVEL = void 0;
		const tslib_1 = tslib_es6;
		const fs_1 = fs;
		const stream_1 = require$$2;
		const util_1 = require$$1;
		const zlib_1 = tslib_1.__importDefault(require$$4);
		const FakeFS_1 = requireFakeFS();
		const NodeFS_1 = requireNodeFS();
		const opendir_1 = requireOpendir();
		const watchFile_1 = requireWatchFile();
		const constants_1 = requireConstants();
		const errors = tslib_1.__importStar(requireErrors());
		const path_1 = requirePath();
		const statUtils = tslib_1.__importStar(requireStatUtils());
		exports.DEFAULT_COMPRESSION_LEVEL = `mixed`;
		function toUnixTimestamp(time) {
		    if (typeof time === `string` && String(+time) === time)
		        return +time;
		    if (Number.isFinite(time)) {
		        if (time < 0) {
		            return Date.now() / 1000;
		        }
		        else {
		            return time;
		        }
		    }
		    // convert to 123.456 UNIX timestamp
		    if (util_1.types.isDate(time))
		        return time.getTime() / 1000;
		    throw new Error(`Invalid time`);
		}
		function makeEmptyArchive() {
		    return Buffer.from([
		        0x50, 0x4B, 0x05, 0x06,
		        0x00, 0x00, 0x00, 0x00,
		        0x00, 0x00, 0x00, 0x00,
		        0x00, 0x00, 0x00, 0x00,
		        0x00, 0x00, 0x00, 0x00,
		        0x00, 0x00,
		    ]);
		}
		exports.makeEmptyArchive = makeEmptyArchive;
		class ZipFS extends FakeFS_1.BasePortableFakeFS {
		    constructor(source, opts) {
		        super();
		        this.lzSource = null;
		        this.listings = new Map();
		        this.entries = new Map();
		        /**
		         * A cache of indices mapped to file sources.
		         * Populated by `setFileSource` calls.
		         * Required for supporting read after write.
		         */
		        this.fileSources = new Map();
		        this.fds = new Map();
		        this.nextFd = 0;
		        this.ready = false;
		        this.readOnly = false;
		        this.libzip = opts.libzip;
		        const pathOptions = opts;
		        this.level = typeof pathOptions.level !== `undefined`
		            ? pathOptions.level
		            : exports.DEFAULT_COMPRESSION_LEVEL;
		        source !== null && source !== void 0 ? source : (source = makeEmptyArchive());
		        if (typeof source === `string`) {
		            const { baseFs = new NodeFS_1.NodeFS() } = pathOptions;
		            this.baseFs = baseFs;
		            this.path = source;
		        }
		        else {
		            this.path = null;
		            this.baseFs = null;
		        }
		        if (opts.stats) {
		            this.stats = opts.stats;
		        }
		        else {
		            if (typeof source === `string`) {
		                try {
		                    this.stats = this.baseFs.statSync(source);
		                }
		                catch (error) {
		                    if (error.code === `ENOENT` && pathOptions.create) {
		                        this.stats = statUtils.makeDefaultStats();
		                    }
		                    else {
		                        throw error;
		                    }
		                }
		            }
		            else {
		                this.stats = statUtils.makeDefaultStats();
		            }
		        }
		        const errPtr = this.libzip.malloc(4);
		        try {
		            let flags = 0;
		            if (typeof source === `string` && pathOptions.create)
		                flags |= this.libzip.ZIP_CREATE | this.libzip.ZIP_TRUNCATE;
		            if (opts.readOnly) {
		                flags |= this.libzip.ZIP_RDONLY;
		                this.readOnly = true;
		            }
		            if (typeof source === `string`) {
		                this.zip = this.libzip.open(path_1.npath.fromPortablePath(source), flags, errPtr);
		            }
		            else {
		                const lzSource = this.allocateUnattachedSource(source);
		                try {
		                    this.zip = this.libzip.openFromSource(lzSource, flags, errPtr);
		                    this.lzSource = lzSource;
		                }
		                catch (error) {
		                    this.libzip.source.free(lzSource);
		                    throw error;
		                }
		            }
		            if (this.zip === 0) {
		                const error = this.libzip.struct.errorS();
		                this.libzip.error.initWithCode(error, this.libzip.getValue(errPtr, `i32`));
		                throw this.makeLibzipError(error);
		            }
		        }
		        finally {
		            this.libzip.free(errPtr);
		        }
		        this.listings.set(path_1.PortablePath.root, new Set());
		        const entryCount = this.libzip.getNumEntries(this.zip, 0);
		        for (let t = 0; t < entryCount; ++t) {
		            const raw = this.libzip.getName(this.zip, t, 0);
		            if (path_1.ppath.isAbsolute(raw))
		                continue;
		            const p = path_1.ppath.resolve(path_1.PortablePath.root, raw);
		            this.registerEntry(p, t);
		            // If the raw path is a directory, register it
		            // to prevent empty folder being skipped
		            if (raw.endsWith(`/`)) {
		                this.registerListing(p);
		            }
		        }
		        this.symlinkCount = this.libzip.ext.countSymlinks(this.zip);
		        if (this.symlinkCount === -1)
		            throw this.makeLibzipError(this.libzip.getError(this.zip));
		        this.ready = true;
		    }
		    makeLibzipError(error) {
		        const errorCode = this.libzip.struct.errorCodeZip(error);
		        const strerror = this.libzip.error.strerror(error);
		        const libzipError = new errors.LibzipError(strerror, this.libzip.errors[errorCode]);
		        // This error should never come up because of the file source cache
		        if (errorCode === this.libzip.errors.ZIP_ER_CHANGED)
		            throw new Error(`Assertion failed: Unexpected libzip error: ${libzipError.message}`);
		        return libzipError;
		    }
		    getExtractHint(hints) {
		        for (const fileName of this.entries.keys()) {
		            const ext = this.pathUtils.extname(fileName);
		            if (hints.relevantExtensions.has(ext)) {
		                return true;
		            }
		        }
		        return false;
		    }
		    getAllFiles() {
		        return Array.from(this.entries.keys());
		    }
		    getRealPath() {
		        if (!this.path)
		            throw new Error(`ZipFS don't have real paths when loaded from a buffer`);
		        return this.path;
		    }
		    getBufferAndClose() {
		        this.prepareClose();
		        if (!this.lzSource)
		            throw new Error(`ZipFS was not created from a Buffer`);
		        // zip_source_open on an unlink-after-write empty archive fails with "Entry has been deleted"
		        if (this.entries.size === 0) {
		            this.discardAndClose();
		            return makeEmptyArchive();
		        }
		        try {
		            // Prevent close from cleaning up the source
		            this.libzip.source.keep(this.lzSource);
		            // Close the zip archive
		            if (this.libzip.close(this.zip) === -1)
		                throw this.makeLibzipError(this.libzip.getError(this.zip));
		            // Open the source for reading
		            if (this.libzip.source.open(this.lzSource) === -1)
		                throw this.makeLibzipError(this.libzip.source.error(this.lzSource));
		            // Move to the end of source
		            if (this.libzip.source.seek(this.lzSource, 0, 0, this.libzip.SEEK_END) === -1)
		                throw this.makeLibzipError(this.libzip.source.error(this.lzSource));
		            // Get the size of source
		            const size = this.libzip.source.tell(this.lzSource);
		            if (size === -1)
		                throw this.makeLibzipError(this.libzip.source.error(this.lzSource));
		            // Move to the start of source
		            if (this.libzip.source.seek(this.lzSource, 0, 0, this.libzip.SEEK_SET) === -1)
		                throw this.makeLibzipError(this.libzip.source.error(this.lzSource));
		            const buffer = this.libzip.malloc(size);
		            if (!buffer)
		                throw new Error(`Couldn't allocate enough memory`);
		            try {
		                const rc = this.libzip.source.read(this.lzSource, buffer, size);
		                if (rc === -1)
		                    throw this.makeLibzipError(this.libzip.source.error(this.lzSource));
		                else if (rc < size)
		                    throw new Error(`Incomplete read`);
		                else if (rc > size)
		                    throw new Error(`Overread`);
		                const memory = this.libzip.HEAPU8.subarray(buffer, buffer + size);
		                return Buffer.from(memory);
		            }
		            finally {
		                this.libzip.free(buffer);
		            }
		        }
		        finally {
		            this.libzip.source.close(this.lzSource);
		            this.libzip.source.free(this.lzSource);
		            this.ready = false;
		        }
		    }
		    prepareClose() {
		        if (!this.ready)
		            throw errors.EBUSY(`archive closed, close`);
		        (0, watchFile_1.unwatchAllFiles)(this);
		    }
		    saveAndClose() {
		        if (!this.path || !this.baseFs)
		            throw new Error(`ZipFS cannot be saved and must be discarded when loaded from a buffer`);
		        this.prepareClose();
		        if (this.readOnly) {
		            this.discardAndClose();
		            return;
		        }
		        const newMode = this.baseFs.existsSync(this.path) || this.stats.mode === statUtils.DEFAULT_MODE
		            ? undefined
		            : this.stats.mode;
		        // zip_close doesn't persist empty archives
		        if (this.entries.size === 0) {
		            this.discardAndClose();
		            this.baseFs.writeFileSync(this.path, makeEmptyArchive(), { mode: newMode });
		        }
		        else {
		            const rc = this.libzip.close(this.zip);
		            if (rc === -1)
		                throw this.makeLibzipError(this.libzip.getError(this.zip));
		            if (typeof newMode !== `undefined`) {
		                this.baseFs.chmodSync(this.path, newMode);
		            }
		        }
		        this.ready = false;
		    }
		    discardAndClose() {
		        this.prepareClose();
		        this.libzip.discard(this.zip);
		        this.ready = false;
		    }
		    resolve(p) {
		        return path_1.ppath.resolve(path_1.PortablePath.root, p);
		    }
		    async openPromise(p, flags, mode) {
		        return this.openSync(p, flags, mode);
		    }
		    openSync(p, flags, mode) {
		        const fd = this.nextFd++;
		        this.fds.set(fd, { cursor: 0, p });
		        return fd;
		    }
		    hasOpenFileHandles() {
		        return !!this.fds.size;
		    }
		    async opendirPromise(p, opts) {
		        return this.opendirSync(p, opts);
		    }
		    opendirSync(p, opts = {}) {
		        const resolvedP = this.resolveFilename(`opendir '${p}'`, p);
		        if (!this.entries.has(resolvedP) && !this.listings.has(resolvedP))
		            throw errors.ENOENT(`opendir '${p}'`);
		        const directoryListing = this.listings.get(resolvedP);
		        if (!directoryListing)
		            throw errors.ENOTDIR(`opendir '${p}'`);
		        const entries = [...directoryListing];
		        const fd = this.openSync(resolvedP, `r`);
		        const onClose = () => {
		            this.closeSync(fd);
		        };
		        return (0, opendir_1.opendir)(this, resolvedP, entries, { onClose });
		    }
		    async readPromise(fd, buffer, offset, length, position) {
		        return this.readSync(fd, buffer, offset, length, position);
		    }
		    readSync(fd, buffer, offset = 0, length = buffer.byteLength, position = -1) {
		        const entry = this.fds.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`read`);
		        const realPosition = position === -1 || position === null
		            ? entry.cursor
		            : position;
		        const source = this.readFileSync(entry.p);
		        source.copy(buffer, offset, realPosition, realPosition + length);
		        const bytesRead = Math.max(0, Math.min(source.length - realPosition, length));
		        if (position === -1 || position === null)
		            entry.cursor += bytesRead;
		        return bytesRead;
		    }
		    async writePromise(fd, buffer, offset, length, position) {
		        if (typeof buffer === `string`) {
		            return this.writeSync(fd, buffer, position);
		        }
		        else {
		            return this.writeSync(fd, buffer, offset, length, position);
		        }
		    }
		    writeSync(fd, buffer, offset, length, position) {
		        const entry = this.fds.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`read`);
		        throw new Error(`Unimplemented`);
		    }
		    async closePromise(fd) {
		        return this.closeSync(fd);
		    }
		    closeSync(fd) {
		        const entry = this.fds.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`read`);
		        this.fds.delete(fd);
		    }
		    createReadStream(p, { encoding } = {}) {
		        if (p === null)
		            throw new Error(`Unimplemented`);
		        const fd = this.openSync(p, `r`);
		        const stream = Object.assign(new stream_1.PassThrough({
		            emitClose: true,
		            autoDestroy: true,
		            destroy: (error, callback) => {
		                clearImmediate(immediate);
		                this.closeSync(fd);
		                callback(error);
		            },
		        }), {
		            close() {
		                stream.destroy();
		            },
		            bytesRead: 0,
		            path: p,
		        });
		        const immediate = setImmediate(async () => {
		            try {
		                const data = await this.readFilePromise(p, encoding);
		                stream.bytesRead = data.length;
		                stream.end(data);
		            }
		            catch (error) {
		                stream.destroy(error);
		            }
		        });
		        return stream;
		    }
		    createWriteStream(p, { encoding } = {}) {
		        if (this.readOnly)
		            throw errors.EROFS(`open '${p}'`);
		        if (p === null)
		            throw new Error(`Unimplemented`);
		        const chunks = [];
		        const fd = this.openSync(p, `w`);
		        const stream = Object.assign(new stream_1.PassThrough({
		            autoDestroy: true,
		            emitClose: true,
		            destroy: (error, callback) => {
		                try {
		                    if (error) {
		                        callback(error);
		                    }
		                    else {
		                        this.writeFileSync(p, Buffer.concat(chunks), encoding);
		                        callback(null);
		                    }
		                }
		                catch (err) {
		                    callback(err);
		                }
		                finally {
		                    this.closeSync(fd);
		                }
		            },
		        }), {
		            bytesWritten: 0,
		            path: p,
		            close() {
		                stream.destroy();
		            },
		        });
		        stream.on(`data`, chunk => {
		            const chunkBuffer = Buffer.from(chunk);
		            stream.bytesWritten += chunkBuffer.length;
		            chunks.push(chunkBuffer);
		        });
		        return stream;
		    }
		    async realpathPromise(p) {
		        return this.realpathSync(p);
		    }
		    realpathSync(p) {
		        const resolvedP = this.resolveFilename(`lstat '${p}'`, p);
		        if (!this.entries.has(resolvedP) && !this.listings.has(resolvedP))
		            throw errors.ENOENT(`lstat '${p}'`);
		        return resolvedP;
		    }
		    async existsPromise(p) {
		        return this.existsSync(p);
		    }
		    existsSync(p) {
		        if (!this.ready)
		            throw errors.EBUSY(`archive closed, existsSync '${p}'`);
		        if (this.symlinkCount === 0) {
		            const resolvedP = path_1.ppath.resolve(path_1.PortablePath.root, p);
		            return this.entries.has(resolvedP) || this.listings.has(resolvedP);
		        }
		        let resolvedP;
		        try {
		            resolvedP = this.resolveFilename(`stat '${p}'`, p, undefined, false);
		        }
		        catch (error) {
		            return false;
		        }
		        if (resolvedP === undefined)
		            return false;
		        return this.entries.has(resolvedP) || this.listings.has(resolvedP);
		    }
		    async accessPromise(p, mode) {
		        return this.accessSync(p, mode);
		    }
		    accessSync(p, mode = fs_1.constants.F_OK) {
		        const resolvedP = this.resolveFilename(`access '${p}'`, p);
		        if (!this.entries.has(resolvedP) && !this.listings.has(resolvedP))
		            throw errors.ENOENT(`access '${p}'`);
		        if (this.readOnly && (mode & fs_1.constants.W_OK)) {
		            throw errors.EROFS(`access '${p}'`);
		        }
		    }
		    async statPromise(p, opts = { bigint: false }) {
		        if (opts.bigint)
		            return this.statSync(p, { bigint: true });
		        return this.statSync(p);
		    }
		    statSync(p, opts = { bigint: false, throwIfNoEntry: true }) {
		        const resolvedP = this.resolveFilename(`stat '${p}'`, p, undefined, opts.throwIfNoEntry);
		        if (resolvedP === undefined)
		            return undefined;
		        if (!this.entries.has(resolvedP) && !this.listings.has(resolvedP)) {
		            if (opts.throwIfNoEntry === false)
		                return undefined;
		            throw errors.ENOENT(`stat '${p}'`);
		        }
		        if (p[p.length - 1] === `/` && !this.listings.has(resolvedP))
		            throw errors.ENOTDIR(`stat '${p}'`);
		        return this.statImpl(`stat '${p}'`, resolvedP, opts);
		    }
		    async fstatPromise(fd, opts) {
		        return this.fstatSync(fd, opts);
		    }
		    fstatSync(fd, opts) {
		        const entry = this.fds.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`fstatSync`);
		        const { p } = entry;
		        const resolvedP = this.resolveFilename(`stat '${p}'`, p);
		        if (!this.entries.has(resolvedP) && !this.listings.has(resolvedP))
		            throw errors.ENOENT(`stat '${p}'`);
		        if (p[p.length - 1] === `/` && !this.listings.has(resolvedP))
		            throw errors.ENOTDIR(`stat '${p}'`);
		        return this.statImpl(`fstat '${p}'`, resolvedP, opts);
		    }
		    async lstatPromise(p, opts = { bigint: false }) {
		        if (opts.bigint)
		            return this.lstatSync(p, { bigint: true });
		        return this.lstatSync(p);
		    }
		    lstatSync(p, opts = { bigint: false, throwIfNoEntry: true }) {
		        const resolvedP = this.resolveFilename(`lstat '${p}'`, p, false, opts.throwIfNoEntry);
		        if (resolvedP === undefined)
		            return undefined;
		        if (!this.entries.has(resolvedP) && !this.listings.has(resolvedP)) {
		            if (opts.throwIfNoEntry === false)
		                return undefined;
		            throw errors.ENOENT(`lstat '${p}'`);
		        }
		        if (p[p.length - 1] === `/` && !this.listings.has(resolvedP))
		            throw errors.ENOTDIR(`lstat '${p}'`);
		        return this.statImpl(`lstat '${p}'`, resolvedP, opts);
		    }
		    statImpl(reason, p, opts = {}) {
		        const entry = this.entries.get(p);
		        // File, or explicit directory
		        if (typeof entry !== `undefined`) {
		            const stat = this.libzip.struct.statS();
		            const rc = this.libzip.statIndex(this.zip, entry, 0, 0, stat);
		            if (rc === -1)
		                throw this.makeLibzipError(this.libzip.getError(this.zip));
		            const uid = this.stats.uid;
		            const gid = this.stats.gid;
		            const size = (this.libzip.struct.statSize(stat) >>> 0);
		            const blksize = 512;
		            const blocks = Math.ceil(size / blksize);
		            const mtimeMs = (this.libzip.struct.statMtime(stat) >>> 0) * 1000;
		            const atimeMs = mtimeMs;
		            const birthtimeMs = mtimeMs;
		            const ctimeMs = mtimeMs;
		            const atime = new Date(atimeMs);
		            const birthtime = new Date(birthtimeMs);
		            const ctime = new Date(ctimeMs);
		            const mtime = new Date(mtimeMs);
		            const type = this.listings.has(p)
		                ? constants_1.S_IFDIR
		                : this.isSymbolicLink(entry)
		                    ? constants_1.S_IFLNK
		                    : constants_1.S_IFREG;
		            const defaultMode = type === constants_1.S_IFDIR
		                ? 0o755
		                : 0o644;
		            const mode = type | (this.getUnixMode(entry, defaultMode) & 0o777);
		            const crc = this.libzip.struct.statCrc(stat);
		            const statInstance = Object.assign(new statUtils.StatEntry(), { uid, gid, size, blksize, blocks, atime, birthtime, ctime, mtime, atimeMs, birthtimeMs, ctimeMs, mtimeMs, mode, crc });
		            return opts.bigint === true ? statUtils.convertToBigIntStats(statInstance) : statInstance;
		        }
		        // Implicit directory
		        if (this.listings.has(p)) {
		            const uid = this.stats.uid;
		            const gid = this.stats.gid;
		            const size = 0;
		            const blksize = 512;
		            const blocks = 0;
		            const atimeMs = this.stats.mtimeMs;
		            const birthtimeMs = this.stats.mtimeMs;
		            const ctimeMs = this.stats.mtimeMs;
		            const mtimeMs = this.stats.mtimeMs;
		            const atime = new Date(atimeMs);
		            const birthtime = new Date(birthtimeMs);
		            const ctime = new Date(ctimeMs);
		            const mtime = new Date(mtimeMs);
		            const mode = constants_1.S_IFDIR | 0o755;
		            const crc = 0;
		            const statInstance = Object.assign(new statUtils.StatEntry(), { uid, gid, size, blksize, blocks, atime, birthtime, ctime, mtime, atimeMs, birthtimeMs, ctimeMs, mtimeMs, mode, crc });
		            return opts.bigint === true ? statUtils.convertToBigIntStats(statInstance) : statInstance;
		        }
		        throw new Error(`Unreachable`);
		    }
		    getUnixMode(index, defaultMode) {
		        const rc = this.libzip.file.getExternalAttributes(this.zip, index, 0, 0, this.libzip.uint08S, this.libzip.uint32S);
		        if (rc === -1)
		            throw this.makeLibzipError(this.libzip.getError(this.zip));
		        const opsys = this.libzip.getValue(this.libzip.uint08S, `i8`) >>> 0;
		        if (opsys !== this.libzip.ZIP_OPSYS_UNIX)
		            return defaultMode;
		        return this.libzip.getValue(this.libzip.uint32S, `i32`) >>> 16;
		    }
		    registerListing(p) {
		        const existingListing = this.listings.get(p);
		        if (existingListing)
		            return existingListing;
		        const parentListing = this.registerListing(path_1.ppath.dirname(p));
		        parentListing.add(path_1.ppath.basename(p));
		        const newListing = new Set();
		        this.listings.set(p, newListing);
		        return newListing;
		    }
		    registerEntry(p, index) {
		        const parentListing = this.registerListing(path_1.ppath.dirname(p));
		        parentListing.add(path_1.ppath.basename(p));
		        this.entries.set(p, index);
		    }
		    unregisterListing(p) {
		        this.listings.delete(p);
		        const parentListing = this.listings.get(path_1.ppath.dirname(p));
		        parentListing === null || parentListing === void 0 ? void 0 : parentListing.delete(path_1.ppath.basename(p));
		    }
		    unregisterEntry(p) {
		        this.unregisterListing(p);
		        const entry = this.entries.get(p);
		        this.entries.delete(p);
		        if (typeof entry === `undefined`)
		            return;
		        this.fileSources.delete(entry);
		        if (this.isSymbolicLink(entry)) {
		            this.symlinkCount--;
		        }
		    }
		    deleteEntry(p, index) {
		        this.unregisterEntry(p);
		        const rc = this.libzip.delete(this.zip, index);
		        if (rc === -1) {
		            throw this.makeLibzipError(this.libzip.getError(this.zip));
		        }
		    }
		    resolveFilename(reason, p, resolveLastComponent = true, throwIfNoEntry = true) {
		        if (!this.ready)
		            throw errors.EBUSY(`archive closed, ${reason}`);
		        let resolvedP = path_1.ppath.resolve(path_1.PortablePath.root, p);
		        if (resolvedP === `/`)
		            return path_1.PortablePath.root;
		        const fileIndex = this.entries.get(resolvedP);
		        if (resolveLastComponent && fileIndex !== undefined) {
		            if (this.symlinkCount !== 0 && this.isSymbolicLink(fileIndex)) {
		                const target = this.getFileSource(fileIndex).toString();
		                return this.resolveFilename(reason, path_1.ppath.resolve(path_1.ppath.dirname(resolvedP), target), true, throwIfNoEntry);
		            }
		            else {
		                return resolvedP;
		            }
		        }
		        while (true) {
		            const parentP = this.resolveFilename(reason, path_1.ppath.dirname(resolvedP), true, throwIfNoEntry);
		            if (parentP === undefined)
		                return parentP;
		            const isDir = this.listings.has(parentP);
		            const doesExist = this.entries.has(parentP);
		            if (!isDir && !doesExist) {
		                if (throwIfNoEntry === false)
		                    return undefined;
		                throw errors.ENOENT(reason);
		            }
		            if (!isDir)
		                throw errors.ENOTDIR(reason);
		            resolvedP = path_1.ppath.resolve(parentP, path_1.ppath.basename(resolvedP));
		            if (!resolveLastComponent || this.symlinkCount === 0)
		                break;
		            const index = this.libzip.name.locate(this.zip, resolvedP.slice(1));
		            if (index === -1)
		                break;
		            if (this.isSymbolicLink(index)) {
		                const target = this.getFileSource(index).toString();
		                resolvedP = path_1.ppath.resolve(path_1.ppath.dirname(resolvedP), target);
		            }
		            else {
		                break;
		            }
		        }
		        return resolvedP;
		    }
		    allocateBuffer(content) {
		        if (!Buffer.isBuffer(content))
		            content = Buffer.from(content);
		        const buffer = this.libzip.malloc(content.byteLength);
		        if (!buffer)
		            throw new Error(`Couldn't allocate enough memory`);
		        // Copy the file into the Emscripten heap
		        const heap = new Uint8Array(this.libzip.HEAPU8.buffer, buffer, content.byteLength);
		        heap.set(content);
		        return { buffer, byteLength: content.byteLength };
		    }
		    allocateUnattachedSource(content) {
		        const error = this.libzip.struct.errorS();
		        const { buffer, byteLength } = this.allocateBuffer(content);
		        const source = this.libzip.source.fromUnattachedBuffer(buffer, byteLength, 0, true, error);
		        if (source === 0) {
		            this.libzip.free(error);
		            throw this.makeLibzipError(error);
		        }
		        return source;
		    }
		    allocateSource(content) {
		        const { buffer, byteLength } = this.allocateBuffer(content);
		        const source = this.libzip.source.fromBuffer(this.zip, buffer, byteLength, 0, true);
		        if (source === 0) {
		            this.libzip.free(buffer);
		            throw this.makeLibzipError(this.libzip.getError(this.zip));
		        }
		        return source;
		    }
		    setFileSource(p, content) {
		        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
		        const target = path_1.ppath.relative(path_1.PortablePath.root, p);
		        const lzSource = this.allocateSource(content);
		        try {
		            const newIndex = this.libzip.file.add(this.zip, target, lzSource, this.libzip.ZIP_FL_OVERWRITE);
		            if (newIndex === -1)
		                throw this.makeLibzipError(this.libzip.getError(this.zip));
		            if (this.level !== `mixed`) {
		                // Use store for level 0, and deflate for 1..9
		                const method = this.level === 0
		                    ? this.libzip.ZIP_CM_STORE
		                    : this.libzip.ZIP_CM_DEFLATE;
		                const rc = this.libzip.file.setCompression(this.zip, newIndex, 0, method, this.level);
		                if (rc === -1) {
		                    throw this.makeLibzipError(this.libzip.getError(this.zip));
		                }
		            }
		            this.fileSources.set(newIndex, buffer);
		            return newIndex;
		        }
		        catch (error) {
		            this.libzip.source.free(lzSource);
		            throw error;
		        }
		    }
		    isSymbolicLink(index) {
		        if (this.symlinkCount === 0)
		            return false;
		        const attrs = this.libzip.file.getExternalAttributes(this.zip, index, 0, 0, this.libzip.uint08S, this.libzip.uint32S);
		        if (attrs === -1)
		            throw this.makeLibzipError(this.libzip.getError(this.zip));
		        const opsys = this.libzip.getValue(this.libzip.uint08S, `i8`) >>> 0;
		        if (opsys !== this.libzip.ZIP_OPSYS_UNIX)
		            return false;
		        const attributes = this.libzip.getValue(this.libzip.uint32S, `i32`) >>> 16;
		        return (attributes & constants_1.S_IFMT) === constants_1.S_IFLNK;
		    }
		    getFileSource(index, opts = { asyncDecompress: false }) {
		        const cachedFileSource = this.fileSources.get(index);
		        if (typeof cachedFileSource !== `undefined`)
		            return cachedFileSource;
		        const stat = this.libzip.struct.statS();
		        const rc = this.libzip.statIndex(this.zip, index, 0, 0, stat);
		        if (rc === -1)
		            throw this.makeLibzipError(this.libzip.getError(this.zip));
		        const size = this.libzip.struct.statCompSize(stat);
		        const compressionMethod = this.libzip.struct.statCompMethod(stat);
		        const buffer = this.libzip.malloc(size);
		        try {
		            const file = this.libzip.fopenIndex(this.zip, index, 0, this.libzip.ZIP_FL_COMPRESSED);
		            if (file === 0)
		                throw this.makeLibzipError(this.libzip.getError(this.zip));
		            try {
		                const rc = this.libzip.fread(file, buffer, size, 0);
		                if (rc === -1)
		                    throw this.makeLibzipError(this.libzip.file.getError(file));
		                else if (rc < size)
		                    throw new Error(`Incomplete read`);
		                else if (rc > size)
		                    throw new Error(`Overread`);
		                const memory = this.libzip.HEAPU8.subarray(buffer, buffer + size);
		                const data = Buffer.from(memory);
		                if (compressionMethod === 0) {
		                    this.fileSources.set(index, data);
		                    return data;
		                }
		                else if (opts.asyncDecompress) {
		                    return new Promise((resolve, reject) => {
		                        zlib_1.default.inflateRaw(data, (error, result) => {
		                            if (error) {
		                                reject(error);
		                            }
		                            else {
		                                this.fileSources.set(index, result);
		                                resolve(result);
		                            }
		                        });
		                    });
		                }
		                else {
		                    const decompressedData = zlib_1.default.inflateRawSync(data);
		                    this.fileSources.set(index, decompressedData);
		                    return decompressedData;
		                }
		            }
		            finally {
		                this.libzip.fclose(file);
		            }
		        }
		        finally {
		            this.libzip.free(buffer);
		        }
		    }
		    async fchmodPromise(fd, mask) {
		        return this.chmodPromise(this.fdToPath(fd, `fchmod`), mask);
		    }
		    fchmodSync(fd, mask) {
		        return this.chmodSync(this.fdToPath(fd, `fchmodSync`), mask);
		    }
		    async chmodPromise(p, mask) {
		        return this.chmodSync(p, mask);
		    }
		    chmodSync(p, mask) {
		        if (this.readOnly)
		            throw errors.EROFS(`chmod '${p}'`);
		        // We don't allow to make the extracted entries group-writable
		        mask &= 0o755;
		        const resolvedP = this.resolveFilename(`chmod '${p}'`, p, false);
		        const entry = this.entries.get(resolvedP);
		        if (typeof entry === `undefined`)
		            throw new Error(`Assertion failed: The entry should have been registered (${resolvedP})`);
		        const oldMod = this.getUnixMode(entry, constants_1.S_IFREG | 0o000);
		        const newMod = oldMod & (~0o777) | mask;
		        const rc = this.libzip.file.setExternalAttributes(this.zip, entry, 0, 0, this.libzip.ZIP_OPSYS_UNIX, newMod << 16);
		        if (rc === -1) {
		            throw this.makeLibzipError(this.libzip.getError(this.zip));
		        }
		    }
		    async fchownPromise(fd, uid, gid) {
		        return this.chownPromise(this.fdToPath(fd, `fchown`), uid, gid);
		    }
		    fchownSync(fd, uid, gid) {
		        return this.chownSync(this.fdToPath(fd, `fchownSync`), uid, gid);
		    }
		    async chownPromise(p, uid, gid) {
		        return this.chownSync(p, uid, gid);
		    }
		    chownSync(p, uid, gid) {
		        throw new Error(`Unimplemented`);
		    }
		    async renamePromise(oldP, newP) {
		        return this.renameSync(oldP, newP);
		    }
		    renameSync(oldP, newP) {
		        throw new Error(`Unimplemented`);
		    }
		    async copyFilePromise(sourceP, destP, flags) {
		        const { indexSource, indexDest, resolvedDestP } = this.prepareCopyFile(sourceP, destP, flags);
		        const source = await this.getFileSource(indexSource, { asyncDecompress: true });
		        const newIndex = this.setFileSource(resolvedDestP, source);
		        if (newIndex !== indexDest) {
		            this.registerEntry(resolvedDestP, newIndex);
		        }
		    }
		    copyFileSync(sourceP, destP, flags = 0) {
		        const { indexSource, indexDest, resolvedDestP } = this.prepareCopyFile(sourceP, destP, flags);
		        const source = this.getFileSource(indexSource);
		        const newIndex = this.setFileSource(resolvedDestP, source);
		        if (newIndex !== indexDest) {
		            this.registerEntry(resolvedDestP, newIndex);
		        }
		    }
		    prepareCopyFile(sourceP, destP, flags = 0) {
		        if (this.readOnly)
		            throw errors.EROFS(`copyfile '${sourceP} -> '${destP}'`);
		        if ((flags & fs_1.constants.COPYFILE_FICLONE_FORCE) !== 0)
		            throw errors.ENOSYS(`unsupported clone operation`, `copyfile '${sourceP}' -> ${destP}'`);
		        const resolvedSourceP = this.resolveFilename(`copyfile '${sourceP} -> ${destP}'`, sourceP);
		        const indexSource = this.entries.get(resolvedSourceP);
		        if (typeof indexSource === `undefined`)
		            throw errors.EINVAL(`copyfile '${sourceP}' -> '${destP}'`);
		        const resolvedDestP = this.resolveFilename(`copyfile '${sourceP}' -> ${destP}'`, destP);
		        const indexDest = this.entries.get(resolvedDestP);
		        if ((flags & (fs_1.constants.COPYFILE_EXCL | fs_1.constants.COPYFILE_FICLONE_FORCE)) !== 0 && typeof indexDest !== `undefined`)
		            throw errors.EEXIST(`copyfile '${sourceP}' -> '${destP}'`);
		        return {
		            indexSource,
		            resolvedDestP,
		            indexDest,
		        };
		    }
		    async appendFilePromise(p, content, opts) {
		        if (this.readOnly)
		            throw errors.EROFS(`open '${p}'`);
		        if (typeof opts === `undefined`)
		            opts = { flag: `a` };
		        else if (typeof opts === `string`)
		            opts = { flag: `a`, encoding: opts };
		        else if (typeof opts.flag === `undefined`)
		            opts = { flag: `a`, ...opts };
		        return this.writeFilePromise(p, content, opts);
		    }
		    appendFileSync(p, content, opts = {}) {
		        if (this.readOnly)
		            throw errors.EROFS(`open '${p}'`);
		        if (typeof opts === `undefined`)
		            opts = { flag: `a` };
		        else if (typeof opts === `string`)
		            opts = { flag: `a`, encoding: opts };
		        else if (typeof opts.flag === `undefined`)
		            opts = { flag: `a`, ...opts };
		        return this.writeFileSync(p, content, opts);
		    }
		    fdToPath(fd, reason) {
		        var _a;
		        const path = (_a = this.fds.get(fd)) === null || _a === void 0 ? void 0 : _a.p;
		        if (typeof path === `undefined`)
		            throw errors.EBADF(reason);
		        return path;
		    }
		    async writeFilePromise(p, content, opts) {
		        const { encoding, mode, index, resolvedP } = this.prepareWriteFile(p, opts);
		        if (index !== undefined && typeof opts === `object` && opts.flag && opts.flag.includes(`a`))
		            content = Buffer.concat([await this.getFileSource(index, { asyncDecompress: true }), Buffer.from(content)]);
		        if (encoding !== null)
		            content = content.toString(encoding);
		        const newIndex = this.setFileSource(resolvedP, content);
		        if (newIndex !== index)
		            this.registerEntry(resolvedP, newIndex);
		        if (mode !== null) {
		            await this.chmodPromise(resolvedP, mode);
		        }
		    }
		    writeFileSync(p, content, opts) {
		        const { encoding, mode, index, resolvedP } = this.prepareWriteFile(p, opts);
		        if (index !== undefined && typeof opts === `object` && opts.flag && opts.flag.includes(`a`))
		            content = Buffer.concat([this.getFileSource(index), Buffer.from(content)]);
		        if (encoding !== null)
		            content = content.toString(encoding);
		        const newIndex = this.setFileSource(resolvedP, content);
		        if (newIndex !== index)
		            this.registerEntry(resolvedP, newIndex);
		        if (mode !== null) {
		            this.chmodSync(resolvedP, mode);
		        }
		    }
		    prepareWriteFile(p, opts) {
		        if (typeof p === `number`)
		            p = this.fdToPath(p, `read`);
		        if (this.readOnly)
		            throw errors.EROFS(`open '${p}'`);
		        const resolvedP = this.resolveFilename(`open '${p}'`, p);
		        if (this.listings.has(resolvedP))
		            throw errors.EISDIR(`open '${p}'`);
		        let encoding = null, mode = null;
		        if (typeof opts === `string`) {
		            encoding = opts;
		        }
		        else if (typeof opts === `object`) {
		            ({
		                encoding = null,
		                mode = null,
		            } = opts);
		        }
		        const index = this.entries.get(resolvedP);
		        return {
		            encoding,
		            mode,
		            resolvedP,
		            index,
		        };
		    }
		    async unlinkPromise(p) {
		        return this.unlinkSync(p);
		    }
		    unlinkSync(p) {
		        if (this.readOnly)
		            throw errors.EROFS(`unlink '${p}'`);
		        const resolvedP = this.resolveFilename(`unlink '${p}'`, p);
		        if (this.listings.has(resolvedP))
		            throw errors.EISDIR(`unlink '${p}'`);
		        const index = this.entries.get(resolvedP);
		        if (typeof index === `undefined`)
		            throw errors.EINVAL(`unlink '${p}'`);
		        this.deleteEntry(resolvedP, index);
		    }
		    async utimesPromise(p, atime, mtime) {
		        return this.utimesSync(p, atime, mtime);
		    }
		    utimesSync(p, atime, mtime) {
		        if (this.readOnly)
		            throw errors.EROFS(`utimes '${p}'`);
		        const resolvedP = this.resolveFilename(`utimes '${p}'`, p);
		        this.utimesImpl(resolvedP, mtime);
		    }
		    async lutimesPromise(p, atime, mtime) {
		        return this.lutimesSync(p, atime, mtime);
		    }
		    lutimesSync(p, atime, mtime) {
		        if (this.readOnly)
		            throw errors.EROFS(`lutimes '${p}'`);
		        const resolvedP = this.resolveFilename(`utimes '${p}'`, p, false);
		        this.utimesImpl(resolvedP, mtime);
		    }
		    utimesImpl(resolvedP, mtime) {
		        if (this.listings.has(resolvedP))
		            if (!this.entries.has(resolvedP))
		                this.hydrateDirectory(resolvedP);
		        const entry = this.entries.get(resolvedP);
		        if (entry === undefined)
		            throw new Error(`Unreachable`);
		        const rc = this.libzip.file.setMtime(this.zip, entry, 0, toUnixTimestamp(mtime), 0);
		        if (rc === -1) {
		            throw this.makeLibzipError(this.libzip.getError(this.zip));
		        }
		    }
		    async mkdirPromise(p, opts) {
		        return this.mkdirSync(p, opts);
		    }
		    mkdirSync(p, { mode = 0o755, recursive = false } = {}) {
		        if (recursive)
		            return this.mkdirpSync(p, { chmod: mode });
		        if (this.readOnly)
		            throw errors.EROFS(`mkdir '${p}'`);
		        const resolvedP = this.resolveFilename(`mkdir '${p}'`, p);
		        if (this.entries.has(resolvedP) || this.listings.has(resolvedP))
		            throw errors.EEXIST(`mkdir '${p}'`);
		        this.hydrateDirectory(resolvedP);
		        this.chmodSync(resolvedP, mode);
		        return undefined;
		    }
		    async rmdirPromise(p, opts) {
		        return this.rmdirSync(p, opts);
		    }
		    rmdirSync(p, { recursive = false } = {}) {
		        if (this.readOnly)
		            throw errors.EROFS(`rmdir '${p}'`);
		        if (recursive) {
		            this.removeSync(p);
		            return;
		        }
		        const resolvedP = this.resolveFilename(`rmdir '${p}'`, p);
		        const directoryListing = this.listings.get(resolvedP);
		        if (!directoryListing)
		            throw errors.ENOTDIR(`rmdir '${p}'`);
		        if (directoryListing.size > 0)
		            throw errors.ENOTEMPTY(`rmdir '${p}'`);
		        const index = this.entries.get(resolvedP);
		        if (typeof index === `undefined`)
		            throw errors.EINVAL(`rmdir '${p}'`);
		        this.deleteEntry(p, index);
		    }
		    hydrateDirectory(resolvedP) {
		        const index = this.libzip.dir.add(this.zip, path_1.ppath.relative(path_1.PortablePath.root, resolvedP));
		        if (index === -1)
		            throw this.makeLibzipError(this.libzip.getError(this.zip));
		        this.registerListing(resolvedP);
		        this.registerEntry(resolvedP, index);
		        return index;
		    }
		    async linkPromise(existingP, newP) {
		        return this.linkSync(existingP, newP);
		    }
		    linkSync(existingP, newP) {
		        // Zip archives don't support hard links:
		        // https://stackoverflow.com/questions/8859616/are-hard-links-possible-within-a-zip-archive
		        throw errors.EOPNOTSUPP(`link '${existingP}' -> '${newP}'`);
		    }
		    async symlinkPromise(target, p) {
		        return this.symlinkSync(target, p);
		    }
		    symlinkSync(target, p) {
		        if (this.readOnly)
		            throw errors.EROFS(`symlink '${target}' -> '${p}'`);
		        const resolvedP = this.resolveFilename(`symlink '${target}' -> '${p}'`, p);
		        if (this.listings.has(resolvedP))
		            throw errors.EISDIR(`symlink '${target}' -> '${p}'`);
		        if (this.entries.has(resolvedP))
		            throw errors.EEXIST(`symlink '${target}' -> '${p}'`);
		        const index = this.setFileSource(resolvedP, target);
		        this.registerEntry(resolvedP, index);
		        const rc = this.libzip.file.setExternalAttributes(this.zip, index, 0, 0, this.libzip.ZIP_OPSYS_UNIX, (constants_1.S_IFLNK | 0o777) << 16);
		        if (rc === -1)
		            throw this.makeLibzipError(this.libzip.getError(this.zip));
		        this.symlinkCount += 1;
		    }
		    async readFilePromise(p, encoding) {
		        // This is messed up regarding the TS signatures
		        if (typeof encoding === `object`)
		            // @ts-expect-error
		            encoding = encoding ? encoding.encoding : undefined;
		        const data = await this.readFileBuffer(p, { asyncDecompress: true });
		        return encoding ? data.toString(encoding) : data;
		    }
		    readFileSync(p, encoding) {
		        // This is messed up regarding the TS signatures
		        if (typeof encoding === `object`)
		            // @ts-expect-error
		            encoding = encoding ? encoding.encoding : undefined;
		        const data = this.readFileBuffer(p);
		        return encoding ? data.toString(encoding) : data;
		    }
		    readFileBuffer(p, opts = { asyncDecompress: false }) {
		        if (typeof p === `number`)
		            p = this.fdToPath(p, `read`);
		        const resolvedP = this.resolveFilename(`open '${p}'`, p);
		        if (!this.entries.has(resolvedP) && !this.listings.has(resolvedP))
		            throw errors.ENOENT(`open '${p}'`);
		        // Ensures that the last component is a directory, if the user said so (even if it is we'll throw right after with EISDIR anyway)
		        if (p[p.length - 1] === `/` && !this.listings.has(resolvedP))
		            throw errors.ENOTDIR(`open '${p}'`);
		        if (this.listings.has(resolvedP))
		            throw errors.EISDIR(`read`);
		        const entry = this.entries.get(resolvedP);
		        if (entry === undefined)
		            throw new Error(`Unreachable`);
		        return this.getFileSource(entry, opts);
		    }
		    async readdirPromise(p, opts) {
		        return this.readdirSync(p, opts);
		    }
		    readdirSync(p, opts) {
		        const resolvedP = this.resolveFilename(`scandir '${p}'`, p);
		        if (!this.entries.has(resolvedP) && !this.listings.has(resolvedP))
		            throw errors.ENOENT(`scandir '${p}'`);
		        const directoryListing = this.listings.get(resolvedP);
		        if (!directoryListing)
		            throw errors.ENOTDIR(`scandir '${p}'`);
		        const entries = [...directoryListing];
		        if (!(opts === null || opts === void 0 ? void 0 : opts.withFileTypes))
		            return entries;
		        return entries.map(name => {
		            return Object.assign(this.statImpl(`lstat`, path_1.ppath.join(p, name)), {
		                name,
		            });
		        });
		    }
		    async readlinkPromise(p) {
		        const entry = this.prepareReadlink(p);
		        return (await this.getFileSource(entry, { asyncDecompress: true })).toString();
		    }
		    readlinkSync(p) {
		        const entry = this.prepareReadlink(p);
		        return this.getFileSource(entry).toString();
		    }
		    prepareReadlink(p) {
		        const resolvedP = this.resolveFilename(`readlink '${p}'`, p, false);
		        if (!this.entries.has(resolvedP) && !this.listings.has(resolvedP))
		            throw errors.ENOENT(`readlink '${p}'`);
		        // Ensure that the last component is a directory (if it is we'll throw right after with EISDIR anyway)
		        if (p[p.length - 1] === `/` && !this.listings.has(resolvedP))
		            throw errors.ENOTDIR(`open '${p}'`);
		        if (this.listings.has(resolvedP))
		            throw errors.EINVAL(`readlink '${p}'`);
		        const entry = this.entries.get(resolvedP);
		        if (entry === undefined)
		            throw new Error(`Unreachable`);
		        if (!this.isSymbolicLink(entry))
		            throw errors.EINVAL(`readlink '${p}'`);
		        return entry;
		    }
		    async truncatePromise(p, len = 0) {
		        const resolvedP = this.resolveFilename(`open '${p}'`, p);
		        const index = this.entries.get(resolvedP);
		        if (typeof index === `undefined`)
		            throw errors.EINVAL(`open '${p}'`);
		        const source = await this.getFileSource(index, { asyncDecompress: true });
		        const truncated = Buffer.alloc(len, 0x00);
		        source.copy(truncated);
		        return await this.writeFilePromise(p, truncated);
		    }
		    truncateSync(p, len = 0) {
		        const resolvedP = this.resolveFilename(`open '${p}'`, p);
		        const index = this.entries.get(resolvedP);
		        if (typeof index === `undefined`)
		            throw errors.EINVAL(`open '${p}'`);
		        const source = this.getFileSource(index);
		        const truncated = Buffer.alloc(len, 0x00);
		        source.copy(truncated);
		        return this.writeFileSync(p, truncated);
		    }
		    async ftruncatePromise(fd, len) {
		        return this.truncatePromise(this.fdToPath(fd, `ftruncate`), len);
		    }
		    ftruncateSync(fd, len) {
		        return this.truncateSync(this.fdToPath(fd, `ftruncateSync`), len);
		    }
		    watch(p, a, b) {
		        let persistent;
		        switch (typeof a) {
		            case `function`:
		            case `string`:
		            case `undefined`:
		                {
		                    persistent = true;
		                }
		                break;
		            default:
		                {
		                    ({ persistent = true } = a);
		                }
		                break;
		        }
		        if (!persistent)
		            return { on: () => { }, close: () => { } };
		        const interval = setInterval(() => { }, 24 * 60 * 60 * 1000);
		        return { on: () => { }, close: () => {
		                clearInterval(interval);
		            } };
		    }
		    watchFile(p, a, b) {
		        const resolvedP = path_1.ppath.resolve(path_1.PortablePath.root, p);
		        return (0, watchFile_1.watchFile)(this, resolvedP, a, b);
		    }
		    unwatchFile(p, cb) {
		        const resolvedP = path_1.ppath.resolve(path_1.PortablePath.root, p);
		        return (0, watchFile_1.unwatchFile)(this, resolvedP, cb);
		    }
		}
		exports.ZipFS = ZipFS;
} (ZipFS));
	return ZipFS;
}

var AliasFS = {};

var ProxiedFS$1 = {};

var hasRequiredProxiedFS;

function requireProxiedFS () {
	if (hasRequiredProxiedFS) return ProxiedFS$1;
	hasRequiredProxiedFS = 1;
	Object.defineProperty(ProxiedFS$1, "__esModule", { value: true });
	ProxiedFS$1.ProxiedFS = void 0;
	const FakeFS_1 = requireFakeFS();
	class ProxiedFS extends FakeFS_1.FakeFS {
	    getExtractHint(hints) {
	        return this.baseFs.getExtractHint(hints);
	    }
	    resolve(path) {
	        return this.mapFromBase(this.baseFs.resolve(this.mapToBase(path)));
	    }
	    getRealPath() {
	        return this.mapFromBase(this.baseFs.getRealPath());
	    }
	    async openPromise(p, flags, mode) {
	        return this.baseFs.openPromise(this.mapToBase(p), flags, mode);
	    }
	    openSync(p, flags, mode) {
	        return this.baseFs.openSync(this.mapToBase(p), flags, mode);
	    }
	    async opendirPromise(p, opts) {
	        return Object.assign(await this.baseFs.opendirPromise(this.mapToBase(p), opts), { path: p });
	    }
	    opendirSync(p, opts) {
	        return Object.assign(this.baseFs.opendirSync(this.mapToBase(p), opts), { path: p });
	    }
	    async readPromise(fd, buffer, offset, length, position) {
	        return await this.baseFs.readPromise(fd, buffer, offset, length, position);
	    }
	    readSync(fd, buffer, offset, length, position) {
	        return this.baseFs.readSync(fd, buffer, offset, length, position);
	    }
	    async writePromise(fd, buffer, offset, length, position) {
	        if (typeof buffer === `string`) {
	            return await this.baseFs.writePromise(fd, buffer, offset);
	        }
	        else {
	            return await this.baseFs.writePromise(fd, buffer, offset, length, position);
	        }
	    }
	    writeSync(fd, buffer, offset, length, position) {
	        if (typeof buffer === `string`) {
	            return this.baseFs.writeSync(fd, buffer, offset);
	        }
	        else {
	            return this.baseFs.writeSync(fd, buffer, offset, length, position);
	        }
	    }
	    async closePromise(fd) {
	        return this.baseFs.closePromise(fd);
	    }
	    closeSync(fd) {
	        this.baseFs.closeSync(fd);
	    }
	    createReadStream(p, opts) {
	        return this.baseFs.createReadStream(p !== null ? this.mapToBase(p) : p, opts);
	    }
	    createWriteStream(p, opts) {
	        return this.baseFs.createWriteStream(p !== null ? this.mapToBase(p) : p, opts);
	    }
	    async realpathPromise(p) {
	        return this.mapFromBase(await this.baseFs.realpathPromise(this.mapToBase(p)));
	    }
	    realpathSync(p) {
	        return this.mapFromBase(this.baseFs.realpathSync(this.mapToBase(p)));
	    }
	    async existsPromise(p) {
	        return this.baseFs.existsPromise(this.mapToBase(p));
	    }
	    existsSync(p) {
	        return this.baseFs.existsSync(this.mapToBase(p));
	    }
	    accessSync(p, mode) {
	        return this.baseFs.accessSync(this.mapToBase(p), mode);
	    }
	    async accessPromise(p, mode) {
	        return this.baseFs.accessPromise(this.mapToBase(p), mode);
	    }
	    async statPromise(p, opts) {
	        return this.baseFs.statPromise(this.mapToBase(p), opts);
	    }
	    statSync(p, opts) {
	        return this.baseFs.statSync(this.mapToBase(p), opts);
	    }
	    async fstatPromise(fd, opts) {
	        return this.baseFs.fstatPromise(fd, opts);
	    }
	    fstatSync(fd, opts) {
	        return this.baseFs.fstatSync(fd, opts);
	    }
	    lstatPromise(p, opts) {
	        return this.baseFs.lstatPromise(this.mapToBase(p), opts);
	    }
	    lstatSync(p, opts) {
	        return this.baseFs.lstatSync(this.mapToBase(p), opts);
	    }
	    async fchmodPromise(fd, mask) {
	        return this.baseFs.fchmodPromise(fd, mask);
	    }
	    fchmodSync(fd, mask) {
	        return this.baseFs.fchmodSync(fd, mask);
	    }
	    async chmodPromise(p, mask) {
	        return this.baseFs.chmodPromise(this.mapToBase(p), mask);
	    }
	    chmodSync(p, mask) {
	        return this.baseFs.chmodSync(this.mapToBase(p), mask);
	    }
	    async fchownPromise(fd, uid, gid) {
	        return this.baseFs.fchownPromise(fd, uid, gid);
	    }
	    fchownSync(fd, uid, gid) {
	        return this.baseFs.fchownSync(fd, uid, gid);
	    }
	    async chownPromise(p, uid, gid) {
	        return this.baseFs.chownPromise(this.mapToBase(p), uid, gid);
	    }
	    chownSync(p, uid, gid) {
	        return this.baseFs.chownSync(this.mapToBase(p), uid, gid);
	    }
	    async renamePromise(oldP, newP) {
	        return this.baseFs.renamePromise(this.mapToBase(oldP), this.mapToBase(newP));
	    }
	    renameSync(oldP, newP) {
	        return this.baseFs.renameSync(this.mapToBase(oldP), this.mapToBase(newP));
	    }
	    async copyFilePromise(sourceP, destP, flags = 0) {
	        return this.baseFs.copyFilePromise(this.mapToBase(sourceP), this.mapToBase(destP), flags);
	    }
	    copyFileSync(sourceP, destP, flags = 0) {
	        return this.baseFs.copyFileSync(this.mapToBase(sourceP), this.mapToBase(destP), flags);
	    }
	    async appendFilePromise(p, content, opts) {
	        return this.baseFs.appendFilePromise(this.fsMapToBase(p), content, opts);
	    }
	    appendFileSync(p, content, opts) {
	        return this.baseFs.appendFileSync(this.fsMapToBase(p), content, opts);
	    }
	    async writeFilePromise(p, content, opts) {
	        return this.baseFs.writeFilePromise(this.fsMapToBase(p), content, opts);
	    }
	    writeFileSync(p, content, opts) {
	        return this.baseFs.writeFileSync(this.fsMapToBase(p), content, opts);
	    }
	    async unlinkPromise(p) {
	        return this.baseFs.unlinkPromise(this.mapToBase(p));
	    }
	    unlinkSync(p) {
	        return this.baseFs.unlinkSync(this.mapToBase(p));
	    }
	    async utimesPromise(p, atime, mtime) {
	        return this.baseFs.utimesPromise(this.mapToBase(p), atime, mtime);
	    }
	    utimesSync(p, atime, mtime) {
	        return this.baseFs.utimesSync(this.mapToBase(p), atime, mtime);
	    }
	    async mkdirPromise(p, opts) {
	        return this.baseFs.mkdirPromise(this.mapToBase(p), opts);
	    }
	    mkdirSync(p, opts) {
	        return this.baseFs.mkdirSync(this.mapToBase(p), opts);
	    }
	    async rmdirPromise(p, opts) {
	        return this.baseFs.rmdirPromise(this.mapToBase(p), opts);
	    }
	    rmdirSync(p, opts) {
	        return this.baseFs.rmdirSync(this.mapToBase(p), opts);
	    }
	    async linkPromise(existingP, newP) {
	        return this.baseFs.linkPromise(this.mapToBase(existingP), this.mapToBase(newP));
	    }
	    linkSync(existingP, newP) {
	        return this.baseFs.linkSync(this.mapToBase(existingP), this.mapToBase(newP));
	    }
	    async symlinkPromise(target, p, type) {
	        const mappedP = this.mapToBase(p);
	        if (this.pathUtils.isAbsolute(target))
	            return this.baseFs.symlinkPromise(this.mapToBase(target), mappedP, type);
	        const mappedAbsoluteTarget = this.mapToBase(this.pathUtils.join(this.pathUtils.dirname(p), target));
	        const mappedTarget = this.baseFs.pathUtils.relative(this.baseFs.pathUtils.dirname(mappedP), mappedAbsoluteTarget);
	        return this.baseFs.symlinkPromise(mappedTarget, mappedP, type);
	    }
	    symlinkSync(target, p, type) {
	        const mappedP = this.mapToBase(p);
	        if (this.pathUtils.isAbsolute(target))
	            return this.baseFs.symlinkSync(this.mapToBase(target), mappedP, type);
	        const mappedAbsoluteTarget = this.mapToBase(this.pathUtils.join(this.pathUtils.dirname(p), target));
	        const mappedTarget = this.baseFs.pathUtils.relative(this.baseFs.pathUtils.dirname(mappedP), mappedAbsoluteTarget);
	        return this.baseFs.symlinkSync(mappedTarget, mappedP, type);
	    }
	    async readFilePromise(p, encoding) {
	        // This weird condition is required to tell TypeScript that the signatures are proper (otherwise it thinks that only the generic one is covered)
	        if (encoding === `utf8`) {
	            return this.baseFs.readFilePromise(this.fsMapToBase(p), encoding);
	        }
	        else {
	            return this.baseFs.readFilePromise(this.fsMapToBase(p), encoding);
	        }
	    }
	    readFileSync(p, encoding) {
	        // This weird condition is required to tell TypeScript that the signatures are proper (otherwise it thinks that only the generic one is covered)
	        if (encoding === `utf8`) {
	            return this.baseFs.readFileSync(this.fsMapToBase(p), encoding);
	        }
	        else {
	            return this.baseFs.readFileSync(this.fsMapToBase(p), encoding);
	        }
	    }
	    async readdirPromise(p, opts) {
	        return this.baseFs.readdirPromise(this.mapToBase(p), opts);
	    }
	    readdirSync(p, opts) {
	        return this.baseFs.readdirSync(this.mapToBase(p), opts);
	    }
	    async readlinkPromise(p) {
	        return this.mapFromBase(await this.baseFs.readlinkPromise(this.mapToBase(p)));
	    }
	    readlinkSync(p) {
	        return this.mapFromBase(this.baseFs.readlinkSync(this.mapToBase(p)));
	    }
	    async truncatePromise(p, len) {
	        return this.baseFs.truncatePromise(this.mapToBase(p), len);
	    }
	    truncateSync(p, len) {
	        return this.baseFs.truncateSync(this.mapToBase(p), len);
	    }
	    async ftruncatePromise(fd, len) {
	        return this.baseFs.ftruncatePromise(fd, len);
	    }
	    ftruncateSync(fd, len) {
	        return this.baseFs.ftruncateSync(fd, len);
	    }
	    watch(p, a, b) {
	        return this.baseFs.watch(this.mapToBase(p), 
	        // @ts-expect-error
	        a, b);
	    }
	    watchFile(p, a, b) {
	        return this.baseFs.watchFile(this.mapToBase(p), 
	        // @ts-expect-error
	        a, b);
	    }
	    unwatchFile(p, cb) {
	        return this.baseFs.unwatchFile(this.mapToBase(p), cb);
	    }
	    fsMapToBase(p) {
	        if (typeof p === `number`) {
	            return p;
	        }
	        else {
	            return this.mapToBase(p);
	        }
	    }
	}
	ProxiedFS$1.ProxiedFS = ProxiedFS;
	return ProxiedFS$1;
}

var hasRequiredAliasFS;

function requireAliasFS () {
	if (hasRequiredAliasFS) return AliasFS;
	hasRequiredAliasFS = 1;
	Object.defineProperty(AliasFS, "__esModule", { value: true });
	AliasFS.AliasFS = void 0;
	const ProxiedFS_1 = requireProxiedFS();
	let AliasFS$1 = class AliasFS extends ProxiedFS_1.ProxiedFS {
	    constructor(target, { baseFs, pathUtils }) {
	        super(pathUtils);
	        this.target = target;
	        this.baseFs = baseFs;
	    }
	    getRealPath() {
	        return this.target;
	    }
	    getBaseFs() {
	        return this.baseFs;
	    }
	    mapFromBase(p) {
	        return p;
	    }
	    mapToBase(p) {
	        return p;
	    }
	};
	AliasFS.AliasFS = AliasFS$1;
	return AliasFS;
}

var CwdFS = {};

var hasRequiredCwdFS;

function requireCwdFS () {
	if (hasRequiredCwdFS) return CwdFS;
	hasRequiredCwdFS = 1;
	Object.defineProperty(CwdFS, "__esModule", { value: true });
	CwdFS.CwdFS = void 0;
	const NodeFS_1 = requireNodeFS();
	const ProxiedFS_1 = requireProxiedFS();
	const path_1 = requirePath();
	let CwdFS$1 = class CwdFS extends ProxiedFS_1.ProxiedFS {
	    constructor(target, { baseFs = new NodeFS_1.NodeFS() } = {}) {
	        super(path_1.ppath);
	        this.target = this.pathUtils.normalize(target);
	        this.baseFs = baseFs;
	    }
	    getRealPath() {
	        return this.pathUtils.resolve(this.baseFs.getRealPath(), this.target);
	    }
	    resolve(p) {
	        if (this.pathUtils.isAbsolute(p)) {
	            return path_1.ppath.normalize(p);
	        }
	        else {
	            return this.baseFs.resolve(path_1.ppath.join(this.target, p));
	        }
	    }
	    mapFromBase(path) {
	        return path;
	    }
	    mapToBase(path) {
	        if (this.pathUtils.isAbsolute(path)) {
	            return path;
	        }
	        else {
	            return this.pathUtils.join(this.target, path);
	        }
	    }
	};
	CwdFS.CwdFS = CwdFS$1;
	return CwdFS;
}

var JailFS = {};

var hasRequiredJailFS;

function requireJailFS () {
	if (hasRequiredJailFS) return JailFS;
	hasRequiredJailFS = 1;
	Object.defineProperty(JailFS, "__esModule", { value: true });
	JailFS.JailFS = void 0;
	const NodeFS_1 = requireNodeFS();
	const ProxiedFS_1 = requireProxiedFS();
	const path_1 = requirePath();
	const JAIL_ROOT = path_1.PortablePath.root;
	let JailFS$1 = class JailFS extends ProxiedFS_1.ProxiedFS {
	    constructor(target, { baseFs = new NodeFS_1.NodeFS() } = {}) {
	        super(path_1.ppath);
	        this.target = this.pathUtils.resolve(path_1.PortablePath.root, target);
	        this.baseFs = baseFs;
	    }
	    getRealPath() {
	        return this.pathUtils.resolve(this.baseFs.getRealPath(), this.pathUtils.relative(path_1.PortablePath.root, this.target));
	    }
	    getTarget() {
	        return this.target;
	    }
	    getBaseFs() {
	        return this.baseFs;
	    }
	    mapToBase(p) {
	        const normalized = this.pathUtils.normalize(p);
	        if (this.pathUtils.isAbsolute(p))
	            return this.pathUtils.resolve(this.target, this.pathUtils.relative(JAIL_ROOT, p));
	        if (normalized.match(/^\.\.\/?/))
	            throw new Error(`Resolving this path (${p}) would escape the jail`);
	        return this.pathUtils.resolve(this.target, p);
	    }
	    mapFromBase(p) {
	        return this.pathUtils.resolve(JAIL_ROOT, this.pathUtils.relative(this.target, p));
	    }
	};
	JailFS.JailFS = JailFS$1;
	return JailFS;
}

var LazyFS = {};

var hasRequiredLazyFS;

function requireLazyFS () {
	if (hasRequiredLazyFS) return LazyFS;
	hasRequiredLazyFS = 1;
	Object.defineProperty(LazyFS, "__esModule", { value: true });
	LazyFS.LazyFS = void 0;
	const ProxiedFS_1 = requireProxiedFS();
	let LazyFS$1 = class LazyFS extends ProxiedFS_1.ProxiedFS {
	    constructor(factory, pathUtils) {
	        super(pathUtils);
	        this.instance = null;
	        this.factory = factory;
	    }
	    get baseFs() {
	        if (!this.instance)
	            this.instance = this.factory();
	        return this.instance;
	    }
	    set baseFs(value) {
	        this.instance = value;
	    }
	    mapFromBase(p) {
	        return p;
	    }
	    mapToBase(p) {
	        return p;
	    }
	};
	LazyFS.LazyFS = LazyFS$1;
	return LazyFS;
}

var NoFS = {};

var hasRequiredNoFS;

function requireNoFS () {
	if (hasRequiredNoFS) return NoFS;
	hasRequiredNoFS = 1;
	Object.defineProperty(NoFS, "__esModule", { value: true });
	NoFS.NoFS = void 0;
	const FakeFS_1 = requireFakeFS();
	const path_1 = requirePath();
	const makeError = () => Object.assign(new Error(`ENOSYS: unsupported filesystem access`), { code: `ENOSYS` });
	let NoFS$1 = class NoFS extends FakeFS_1.FakeFS {
	    constructor() {
	        super(path_1.ppath);
	    }
	    getExtractHint() {
	        throw makeError();
	    }
	    getRealPath() {
	        throw makeError();
	    }
	    resolve() {
	        throw makeError();
	    }
	    async openPromise() {
	        throw makeError();
	    }
	    openSync() {
	        throw makeError();
	    }
	    async opendirPromise() {
	        throw makeError();
	    }
	    opendirSync() {
	        throw makeError();
	    }
	    async readPromise() {
	        throw makeError();
	    }
	    readSync() {
	        throw makeError();
	    }
	    async writePromise() {
	        throw makeError();
	    }
	    writeSync() {
	        throw makeError();
	    }
	    async closePromise() {
	        throw makeError();
	    }
	    closeSync() {
	        throw makeError();
	    }
	    createWriteStream() {
	        throw makeError();
	    }
	    createReadStream() {
	        throw makeError();
	    }
	    async realpathPromise() {
	        throw makeError();
	    }
	    realpathSync() {
	        throw makeError();
	    }
	    async readdirPromise() {
	        throw makeError();
	    }
	    readdirSync() {
	        throw makeError();
	    }
	    async existsPromise(p) {
	        throw makeError();
	    }
	    existsSync(p) {
	        throw makeError();
	    }
	    async accessPromise() {
	        throw makeError();
	    }
	    accessSync() {
	        throw makeError();
	    }
	    async statPromise() {
	        throw makeError();
	    }
	    statSync() {
	        throw makeError();
	    }
	    async fstatPromise(fd) {
	        throw makeError();
	    }
	    fstatSync(fd) {
	        throw makeError();
	    }
	    async lstatPromise(p) {
	        throw makeError();
	    }
	    lstatSync(p) {
	        throw makeError();
	    }
	    async fchmodPromise() {
	        throw makeError();
	    }
	    fchmodSync() {
	        throw makeError();
	    }
	    async chmodPromise() {
	        throw makeError();
	    }
	    chmodSync() {
	        throw makeError();
	    }
	    async fchownPromise() {
	        throw makeError();
	    }
	    fchownSync() {
	        throw makeError();
	    }
	    async chownPromise() {
	        throw makeError();
	    }
	    chownSync() {
	        throw makeError();
	    }
	    async mkdirPromise() {
	        throw makeError();
	    }
	    mkdirSync() {
	        throw makeError();
	    }
	    async rmdirPromise() {
	        throw makeError();
	    }
	    rmdirSync() {
	        throw makeError();
	    }
	    async linkPromise() {
	        throw makeError();
	    }
	    linkSync() {
	        throw makeError();
	    }
	    async symlinkPromise() {
	        throw makeError();
	    }
	    symlinkSync() {
	        throw makeError();
	    }
	    async renamePromise() {
	        throw makeError();
	    }
	    renameSync() {
	        throw makeError();
	    }
	    async copyFilePromise() {
	        throw makeError();
	    }
	    copyFileSync() {
	        throw makeError();
	    }
	    async appendFilePromise() {
	        throw makeError();
	    }
	    appendFileSync() {
	        throw makeError();
	    }
	    async writeFilePromise() {
	        throw makeError();
	    }
	    writeFileSync() {
	        throw makeError();
	    }
	    async unlinkPromise() {
	        throw makeError();
	    }
	    unlinkSync() {
	        throw makeError();
	    }
	    async utimesPromise() {
	        throw makeError();
	    }
	    utimesSync() {
	        throw makeError();
	    }
	    async readFilePromise() {
	        throw makeError();
	    }
	    readFileSync() {
	        throw makeError();
	    }
	    async readlinkPromise() {
	        throw makeError();
	    }
	    readlinkSync() {
	        throw makeError();
	    }
	    async truncatePromise() {
	        throw makeError();
	    }
	    truncateSync() {
	        throw makeError();
	    }
	    async ftruncatePromise(fd, len) {
	        throw makeError();
	    }
	    ftruncateSync(fd, len) {
	        throw makeError();
	    }
	    watch() {
	        throw makeError();
	    }
	    watchFile() {
	        throw makeError();
	    }
	    unwatchFile() {
	        throw makeError();
	    }
	};
	NoFS$1.instance = new NoFS$1();
	NoFS.NoFS = NoFS$1;
	return NoFS;
}

var PosixFS = {};

var hasRequiredPosixFS;

function requirePosixFS () {
	if (hasRequiredPosixFS) return PosixFS;
	hasRequiredPosixFS = 1;
	Object.defineProperty(PosixFS, "__esModule", { value: true });
	PosixFS.PosixFS = void 0;
	const ProxiedFS_1 = requireProxiedFS();
	const path_1 = requirePath();
	let PosixFS$1 = class PosixFS extends ProxiedFS_1.ProxiedFS {
	    constructor(baseFs) {
	        super(path_1.npath);
	        this.baseFs = baseFs;
	    }
	    mapFromBase(path) {
	        return path_1.npath.fromPortablePath(path);
	    }
	    mapToBase(path) {
	        return path_1.npath.toPortablePath(path);
	    }
	};
	PosixFS.PosixFS = PosixFS$1;
	return PosixFS;
}

var VirtualFS$1 = {};

var hasRequiredVirtualFS;

function requireVirtualFS () {
	if (hasRequiredVirtualFS) return VirtualFS$1;
	hasRequiredVirtualFS = 1;
	Object.defineProperty(VirtualFS$1, "__esModule", { value: true });
	VirtualFS$1.VirtualFS = void 0;
	const NodeFS_1 = requireNodeFS();
	const ProxiedFS_1 = requireProxiedFS();
	const path_1 = requirePath();
	const NUMBER_REGEXP = /^[0-9]+$/;
	// $0: full path
	// $1: virtual folder
	// $2: virtual segment
	// $3: hash
	// $4: depth
	// $5: subpath
	const VIRTUAL_REGEXP = /^(\/(?:[^/]+\/)*?(?:\$\$virtual|__virtual__))((?:\/((?:[^/]+-)?[a-f0-9]+)(?:\/([^/]+))?)?((?:\/.*)?))$/;
	const VALID_COMPONENT = /^([^/]+-)?[a-f0-9]+$/;
	class VirtualFS extends ProxiedFS_1.ProxiedFS {
	    static makeVirtualPath(base, component, to) {
	        if (path_1.ppath.basename(base) !== `__virtual__`)
	            throw new Error(`Assertion failed: Virtual folders must be named "__virtual__"`);
	        if (!path_1.ppath.basename(component).match(VALID_COMPONENT))
	            throw new Error(`Assertion failed: Virtual components must be ended by an hexadecimal hash`);
	        // Obtains the relative distance between the virtual path and its actual target
	        const target = path_1.ppath.relative(path_1.ppath.dirname(base), to);
	        const segments = target.split(`/`);
	        // Counts how many levels we need to go back to start applying the rest of the path
	        let depth = 0;
	        while (depth < segments.length && segments[depth] === `..`)
	            depth += 1;
	        const finalSegments = segments.slice(depth);
	        const fullVirtualPath = path_1.ppath.join(base, component, String(depth), ...finalSegments);
	        return fullVirtualPath;
	    }
	    static resolveVirtual(p) {
	        const match = p.match(VIRTUAL_REGEXP);
	        if (!match || (!match[3] && match[5]))
	            return p;
	        const target = path_1.ppath.dirname(match[1]);
	        if (!match[3] || !match[4])
	            return target;
	        const isnum = NUMBER_REGEXP.test(match[4]);
	        if (!isnum)
	            return p;
	        const depth = Number(match[4]);
	        const backstep = `../`.repeat(depth);
	        const subpath = (match[5] || `.`);
	        return VirtualFS.resolveVirtual(path_1.ppath.join(target, backstep, subpath));
	    }
	    constructor({ baseFs = new NodeFS_1.NodeFS() } = {}) {
	        super(path_1.ppath);
	        this.baseFs = baseFs;
	    }
	    getExtractHint(hints) {
	        return this.baseFs.getExtractHint(hints);
	    }
	    getRealPath() {
	        return this.baseFs.getRealPath();
	    }
	    realpathSync(p) {
	        const match = p.match(VIRTUAL_REGEXP);
	        if (!match)
	            return this.baseFs.realpathSync(p);
	        if (!match[5])
	            return p;
	        const realpath = this.baseFs.realpathSync(this.mapToBase(p));
	        return VirtualFS.makeVirtualPath(match[1], match[3], realpath);
	    }
	    async realpathPromise(p) {
	        const match = p.match(VIRTUAL_REGEXP);
	        if (!match)
	            return await this.baseFs.realpathPromise(p);
	        if (!match[5])
	            return p;
	        const realpath = await this.baseFs.realpathPromise(this.mapToBase(p));
	        return VirtualFS.makeVirtualPath(match[1], match[3], realpath);
	    }
	    mapToBase(p) {
	        if (p === ``)
	            return p;
	        if (this.pathUtils.isAbsolute(p))
	            return VirtualFS.resolveVirtual(p);
	        const resolvedRoot = VirtualFS.resolveVirtual(this.baseFs.resolve(path_1.PortablePath.dot));
	        const resolvedP = VirtualFS.resolveVirtual(this.baseFs.resolve(p));
	        return path_1.ppath.relative(resolvedRoot, resolvedP) || path_1.PortablePath.dot;
	    }
	    mapFromBase(p) {
	        return p;
	    }
	}
	VirtualFS$1.VirtualFS = VirtualFS;
	return VirtualFS$1;
}

var ZipOpenFS = {};

var hasRequiredZipOpenFS;

function requireZipOpenFS () {
	if (hasRequiredZipOpenFS) return ZipOpenFS;
	hasRequiredZipOpenFS = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.ZipOpenFS = exports.getArchivePart = void 0;
		const tslib_1 = tslib_es6;
		const fs_1 = fs;
		const FakeFS_1 = requireFakeFS();
		const NodeFS_1 = requireNodeFS();
		const ZipFS_1 = requireZipFS();
		const watchFile_1 = requireWatchFile();
		const errors = tslib_1.__importStar(requireErrors());
		const path_1 = requirePath();
		// Only file descriptors prefixed by those values will be forwarded to the ZipFS
		// instances. Note that the highest ZIP_MAGIC bit MUST NOT be set, otherwise the
		// resulting fd becomes a negative integer, which isn't supposed to happen per
		// the unix rules (caused problems w/ Go).
		//
		// Those values must be synced with packages/yarnpkg-pnp/sources/esm-loader/fspatch.ts
		//
		const ZIP_MASK = 0xff000000;
		const ZIP_MAGIC = 0x2a000000;
		/**
		 * Extracts the archive part (ending in the first instance of `extension`) from a path.
		 *
		 * The indexOf-based implementation is ~3.7x faster than a RegExp-based implementation.
		 */
		const getArchivePart = (path, extension) => {
		    let idx = path.indexOf(extension);
		    if (idx <= 0)
		        return null;
		    let nextCharIdx = idx;
		    while (idx >= 0) {
		        nextCharIdx = idx + extension.length;
		        if (path[nextCharIdx] === path_1.ppath.sep)
		            break;
		        // Disallow files named ".zip"
		        if (path[idx - 1] === path_1.ppath.sep)
		            return null;
		        idx = path.indexOf(extension, nextCharIdx);
		    }
		    // The path either has to end in ".zip" or contain an archive subpath (".zip/...")
		    if (path.length > nextCharIdx && path[nextCharIdx] !== path_1.ppath.sep)
		        return null;
		    return path.slice(0, nextCharIdx);
		};
		exports.getArchivePart = getArchivePart;
		class ZipOpenFS extends FakeFS_1.BasePortableFakeFS {
		    static async openPromise(fn, opts) {
		        const zipOpenFs = new ZipOpenFS(opts);
		        try {
		            return await fn(zipOpenFs);
		        }
		        finally {
		            zipOpenFs.saveAndClose();
		        }
		    }
		    get libzip() {
		        if (typeof this.libzipInstance === `undefined`)
		            this.libzipInstance = this.libzipFactory();
		        return this.libzipInstance;
		    }
		    constructor({ libzip, baseFs = new NodeFS_1.NodeFS(), filter = null, maxOpenFiles = Infinity, readOnlyArchives = false, useCache = true, maxAge = 5000, fileExtensions = null }) {
		        super();
		        this.fdMap = new Map();
		        this.nextFd = 3;
		        this.isZip = new Set();
		        this.notZip = new Set();
		        this.realPaths = new Map();
		        this.limitOpenFilesTimeout = null;
		        this.libzipFactory = typeof libzip !== `function`
		            ? () => libzip
		            : libzip;
		        this.baseFs = baseFs;
		        this.zipInstances = useCache ? new Map() : null;
		        this.filter = filter;
		        this.maxOpenFiles = maxOpenFiles;
		        this.readOnlyArchives = readOnlyArchives;
		        this.maxAge = maxAge;
		        this.fileExtensions = fileExtensions;
		    }
		    getExtractHint(hints) {
		        return this.baseFs.getExtractHint(hints);
		    }
		    getRealPath() {
		        return this.baseFs.getRealPath();
		    }
		    saveAndClose() {
		        (0, watchFile_1.unwatchAllFiles)(this);
		        if (this.zipInstances) {
		            for (const [path, { zipFs }] of this.zipInstances.entries()) {
		                zipFs.saveAndClose();
		                this.zipInstances.delete(path);
		            }
		        }
		    }
		    discardAndClose() {
		        (0, watchFile_1.unwatchAllFiles)(this);
		        if (this.zipInstances) {
		            for (const [path, { zipFs }] of this.zipInstances.entries()) {
		                zipFs.discardAndClose();
		                this.zipInstances.delete(path);
		            }
		        }
		    }
		    resolve(p) {
		        return this.baseFs.resolve(p);
		    }
		    remapFd(zipFs, fd) {
		        const remappedFd = this.nextFd++ | ZIP_MAGIC;
		        this.fdMap.set(remappedFd, [zipFs, fd]);
		        return remappedFd;
		    }
		    async openPromise(p, flags, mode) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.openPromise(p, flags, mode);
		        }, async (zipFs, { subPath }) => {
		            return this.remapFd(zipFs, await zipFs.openPromise(subPath, flags, mode));
		        });
		    }
		    openSync(p, flags, mode) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.openSync(p, flags, mode);
		        }, (zipFs, { subPath }) => {
		            return this.remapFd(zipFs, zipFs.openSync(subPath, flags, mode));
		        });
		    }
		    async opendirPromise(p, opts) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.opendirPromise(p, opts);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.opendirPromise(subPath, opts);
		        }, {
		            requireSubpath: false,
		        });
		    }
		    opendirSync(p, opts) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.opendirSync(p, opts);
		        }, (zipFs, { subPath }) => {
		            return zipFs.opendirSync(subPath, opts);
		        }, {
		            requireSubpath: false,
		        });
		    }
		    async readPromise(fd, buffer, offset, length, position) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC)
		            return await this.baseFs.readPromise(fd, buffer, offset, length, position);
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`read`);
		        const [zipFs, realFd] = entry;
		        return await zipFs.readPromise(realFd, buffer, offset, length, position);
		    }
		    readSync(fd, buffer, offset, length, position) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC)
		            return this.baseFs.readSync(fd, buffer, offset, length, position);
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`readSync`);
		        const [zipFs, realFd] = entry;
		        return zipFs.readSync(realFd, buffer, offset, length, position);
		    }
		    async writePromise(fd, buffer, offset, length, position) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC) {
		            if (typeof buffer === `string`) {
		                return await this.baseFs.writePromise(fd, buffer, offset);
		            }
		            else {
		                return await this.baseFs.writePromise(fd, buffer, offset, length, position);
		            }
		        }
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`write`);
		        const [zipFs, realFd] = entry;
		        if (typeof buffer === `string`) {
		            return await zipFs.writePromise(realFd, buffer, offset);
		        }
		        else {
		            return await zipFs.writePromise(realFd, buffer, offset, length, position);
		        }
		    }
		    writeSync(fd, buffer, offset, length, position) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC) {
		            if (typeof buffer === `string`) {
		                return this.baseFs.writeSync(fd, buffer, offset);
		            }
		            else {
		                return this.baseFs.writeSync(fd, buffer, offset, length, position);
		            }
		        }
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`writeSync`);
		        const [zipFs, realFd] = entry;
		        if (typeof buffer === `string`) {
		            return zipFs.writeSync(realFd, buffer, offset);
		        }
		        else {
		            return zipFs.writeSync(realFd, buffer, offset, length, position);
		        }
		    }
		    async closePromise(fd) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC)
		            return await this.baseFs.closePromise(fd);
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`close`);
		        this.fdMap.delete(fd);
		        const [zipFs, realFd] = entry;
		        return await zipFs.closePromise(realFd);
		    }
		    closeSync(fd) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC)
		            return this.baseFs.closeSync(fd);
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`closeSync`);
		        this.fdMap.delete(fd);
		        const [zipFs, realFd] = entry;
		        return zipFs.closeSync(realFd);
		    }
		    createReadStream(p, opts) {
		        if (p === null)
		            return this.baseFs.createReadStream(p, opts);
		        return this.makeCallSync(p, () => {
		            return this.baseFs.createReadStream(p, opts);
		        }, (zipFs, { archivePath, subPath }) => {
		            const stream = zipFs.createReadStream(subPath, opts);
		            // This is a very hacky workaround. `ZipOpenFS` shouldn't have to work with `NativePath`s.
		            // Ref: https://github.com/yarnpkg/berry/pull/3774
		            // TODO: think of a better solution
		            stream.path = path_1.npath.fromPortablePath(this.pathUtils.join(archivePath, subPath));
		            return stream;
		        });
		    }
		    createWriteStream(p, opts) {
		        if (p === null)
		            return this.baseFs.createWriteStream(p, opts);
		        return this.makeCallSync(p, () => {
		            return this.baseFs.createWriteStream(p, opts);
		        }, (zipFs, { subPath }) => {
		            return zipFs.createWriteStream(subPath, opts);
		        });
		    }
		    async realpathPromise(p) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.realpathPromise(p);
		        }, async (zipFs, { archivePath, subPath }) => {
		            let realArchivePath = this.realPaths.get(archivePath);
		            if (typeof realArchivePath === `undefined`) {
		                realArchivePath = await this.baseFs.realpathPromise(archivePath);
		                this.realPaths.set(archivePath, realArchivePath);
		            }
		            return this.pathUtils.join(realArchivePath, this.pathUtils.relative(path_1.PortablePath.root, await zipFs.realpathPromise(subPath)));
		        });
		    }
		    realpathSync(p) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.realpathSync(p);
		        }, (zipFs, { archivePath, subPath }) => {
		            let realArchivePath = this.realPaths.get(archivePath);
		            if (typeof realArchivePath === `undefined`) {
		                realArchivePath = this.baseFs.realpathSync(archivePath);
		                this.realPaths.set(archivePath, realArchivePath);
		            }
		            return this.pathUtils.join(realArchivePath, this.pathUtils.relative(path_1.PortablePath.root, zipFs.realpathSync(subPath)));
		        });
		    }
		    async existsPromise(p) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.existsPromise(p);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.existsPromise(subPath);
		        });
		    }
		    existsSync(p) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.existsSync(p);
		        }, (zipFs, { subPath }) => {
		            return zipFs.existsSync(subPath);
		        });
		    }
		    async accessPromise(p, mode) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.accessPromise(p, mode);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.accessPromise(subPath, mode);
		        });
		    }
		    accessSync(p, mode) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.accessSync(p, mode);
		        }, (zipFs, { subPath }) => {
		            return zipFs.accessSync(subPath, mode);
		        });
		    }
		    async statPromise(p, opts) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.statPromise(p, opts);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.statPromise(subPath, opts);
		        });
		    }
		    statSync(p, opts) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.statSync(p, opts);
		        }, (zipFs, { subPath }) => {
		            return zipFs.statSync(subPath, opts);
		        });
		    }
		    async fstatPromise(fd, opts) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC)
		            return this.baseFs.fstatPromise(fd, opts);
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`fstat`);
		        const [zipFs, realFd] = entry;
		        return zipFs.fstatPromise(realFd, opts);
		    }
		    fstatSync(fd, opts) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC)
		            return this.baseFs.fstatSync(fd, opts);
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`fstatSync`);
		        const [zipFs, realFd] = entry;
		        return zipFs.fstatSync(realFd, opts);
		    }
		    async lstatPromise(p, opts) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.lstatPromise(p, opts);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.lstatPromise(subPath, opts);
		        });
		    }
		    lstatSync(p, opts) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.lstatSync(p, opts);
		        }, (zipFs, { subPath }) => {
		            return zipFs.lstatSync(subPath, opts);
		        });
		    }
		    async fchmodPromise(fd, mask) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC)
		            return this.baseFs.fchmodPromise(fd, mask);
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`fchmod`);
		        const [zipFs, realFd] = entry;
		        return zipFs.fchmodPromise(realFd, mask);
		    }
		    fchmodSync(fd, mask) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC)
		            return this.baseFs.fchmodSync(fd, mask);
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`fchmodSync`);
		        const [zipFs, realFd] = entry;
		        return zipFs.fchmodSync(realFd, mask);
		    }
		    async chmodPromise(p, mask) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.chmodPromise(p, mask);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.chmodPromise(subPath, mask);
		        });
		    }
		    chmodSync(p, mask) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.chmodSync(p, mask);
		        }, (zipFs, { subPath }) => {
		            return zipFs.chmodSync(subPath, mask);
		        });
		    }
		    async fchownPromise(fd, uid, gid) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC)
		            return this.baseFs.fchownPromise(fd, uid, gid);
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`fchown`);
		        const [zipFs, realFd] = entry;
		        return zipFs.fchownPromise(realFd, uid, gid);
		    }
		    fchownSync(fd, uid, gid) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC)
		            return this.baseFs.fchownSync(fd, uid, gid);
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`fchownSync`);
		        const [zipFs, realFd] = entry;
		        return zipFs.fchownSync(realFd, uid, gid);
		    }
		    async chownPromise(p, uid, gid) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.chownPromise(p, uid, gid);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.chownPromise(subPath, uid, gid);
		        });
		    }
		    chownSync(p, uid, gid) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.chownSync(p, uid, gid);
		        }, (zipFs, { subPath }) => {
		            return zipFs.chownSync(subPath, uid, gid);
		        });
		    }
		    async renamePromise(oldP, newP) {
		        return await this.makeCallPromise(oldP, async () => {
		            return await this.makeCallPromise(newP, async () => {
		                return await this.baseFs.renamePromise(oldP, newP);
		            }, async () => {
		                throw Object.assign(new Error(`EEXDEV: cross-device link not permitted`), { code: `EEXDEV` });
		            });
		        }, async (zipFsO, { subPath: subPathO }) => {
		            return await this.makeCallPromise(newP, async () => {
		                throw Object.assign(new Error(`EEXDEV: cross-device link not permitted`), { code: `EEXDEV` });
		            }, async (zipFsN, { subPath: subPathN }) => {
		                if (zipFsO !== zipFsN) {
		                    throw Object.assign(new Error(`EEXDEV: cross-device link not permitted`), { code: `EEXDEV` });
		                }
		                else {
		                    return await zipFsO.renamePromise(subPathO, subPathN);
		                }
		            });
		        });
		    }
		    renameSync(oldP, newP) {
		        return this.makeCallSync(oldP, () => {
		            return this.makeCallSync(newP, () => {
		                return this.baseFs.renameSync(oldP, newP);
		            }, () => {
		                throw Object.assign(new Error(`EEXDEV: cross-device link not permitted`), { code: `EEXDEV` });
		            });
		        }, (zipFsO, { subPath: subPathO }) => {
		            return this.makeCallSync(newP, () => {
		                throw Object.assign(new Error(`EEXDEV: cross-device link not permitted`), { code: `EEXDEV` });
		            }, (zipFsN, { subPath: subPathN }) => {
		                if (zipFsO !== zipFsN) {
		                    throw Object.assign(new Error(`EEXDEV: cross-device link not permitted`), { code: `EEXDEV` });
		                }
		                else {
		                    return zipFsO.renameSync(subPathO, subPathN);
		                }
		            });
		        });
		    }
		    async copyFilePromise(sourceP, destP, flags = 0) {
		        const fallback = async (sourceFs, sourceP, destFs, destP) => {
		            if ((flags & fs_1.constants.COPYFILE_FICLONE_FORCE) !== 0)
		                throw Object.assign(new Error(`EXDEV: cross-device clone not permitted, copyfile '${sourceP}' -> ${destP}'`), { code: `EXDEV` });
		            if ((flags & fs_1.constants.COPYFILE_EXCL) && await this.existsPromise(sourceP))
		                throw Object.assign(new Error(`EEXIST: file already exists, copyfile '${sourceP}' -> '${destP}'`), { code: `EEXIST` });
		            let content;
		            try {
		                content = await sourceFs.readFilePromise(sourceP);
		            }
		            catch (error) {
		                throw Object.assign(new Error(`EINVAL: invalid argument, copyfile '${sourceP}' -> '${destP}'`), { code: `EINVAL` });
		            }
		            await destFs.writeFilePromise(destP, content);
		        };
		        return await this.makeCallPromise(sourceP, async () => {
		            return await this.makeCallPromise(destP, async () => {
		                return await this.baseFs.copyFilePromise(sourceP, destP, flags);
		            }, async (zipFsD, { subPath: subPathD }) => {
		                return await fallback(this.baseFs, sourceP, zipFsD, subPathD);
		            });
		        }, async (zipFsS, { subPath: subPathS }) => {
		            return await this.makeCallPromise(destP, async () => {
		                return await fallback(zipFsS, subPathS, this.baseFs, destP);
		            }, async (zipFsD, { subPath: subPathD }) => {
		                if (zipFsS !== zipFsD) {
		                    return await fallback(zipFsS, subPathS, zipFsD, subPathD);
		                }
		                else {
		                    return await zipFsS.copyFilePromise(subPathS, subPathD, flags);
		                }
		            });
		        });
		    }
		    copyFileSync(sourceP, destP, flags = 0) {
		        const fallback = (sourceFs, sourceP, destFs, destP) => {
		            if ((flags & fs_1.constants.COPYFILE_FICLONE_FORCE) !== 0)
		                throw Object.assign(new Error(`EXDEV: cross-device clone not permitted, copyfile '${sourceP}' -> ${destP}'`), { code: `EXDEV` });
		            if ((flags & fs_1.constants.COPYFILE_EXCL) && this.existsSync(sourceP))
		                throw Object.assign(new Error(`EEXIST: file already exists, copyfile '${sourceP}' -> '${destP}'`), { code: `EEXIST` });
		            let content;
		            try {
		                content = sourceFs.readFileSync(sourceP);
		            }
		            catch (error) {
		                throw Object.assign(new Error(`EINVAL: invalid argument, copyfile '${sourceP}' -> '${destP}'`), { code: `EINVAL` });
		            }
		            destFs.writeFileSync(destP, content);
		        };
		        return this.makeCallSync(sourceP, () => {
		            return this.makeCallSync(destP, () => {
		                return this.baseFs.copyFileSync(sourceP, destP, flags);
		            }, (zipFsD, { subPath: subPathD }) => {
		                return fallback(this.baseFs, sourceP, zipFsD, subPathD);
		            });
		        }, (zipFsS, { subPath: subPathS }) => {
		            return this.makeCallSync(destP, () => {
		                return fallback(zipFsS, subPathS, this.baseFs, destP);
		            }, (zipFsD, { subPath: subPathD }) => {
		                if (zipFsS !== zipFsD) {
		                    return fallback(zipFsS, subPathS, zipFsD, subPathD);
		                }
		                else {
		                    return zipFsS.copyFileSync(subPathS, subPathD, flags);
		                }
		            });
		        });
		    }
		    async appendFilePromise(p, content, opts) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.appendFilePromise(p, content, opts);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.appendFilePromise(subPath, content, opts);
		        });
		    }
		    appendFileSync(p, content, opts) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.appendFileSync(p, content, opts);
		        }, (zipFs, { subPath }) => {
		            return zipFs.appendFileSync(subPath, content, opts);
		        });
		    }
		    async writeFilePromise(p, content, opts) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.writeFilePromise(p, content, opts);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.writeFilePromise(subPath, content, opts);
		        });
		    }
		    writeFileSync(p, content, opts) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.writeFileSync(p, content, opts);
		        }, (zipFs, { subPath }) => {
		            return zipFs.writeFileSync(subPath, content, opts);
		        });
		    }
		    async unlinkPromise(p) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.unlinkPromise(p);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.unlinkPromise(subPath);
		        });
		    }
		    unlinkSync(p) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.unlinkSync(p);
		        }, (zipFs, { subPath }) => {
		            return zipFs.unlinkSync(subPath);
		        });
		    }
		    async utimesPromise(p, atime, mtime) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.utimesPromise(p, atime, mtime);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.utimesPromise(subPath, atime, mtime);
		        });
		    }
		    utimesSync(p, atime, mtime) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.utimesSync(p, atime, mtime);
		        }, (zipFs, { subPath }) => {
		            return zipFs.utimesSync(subPath, atime, mtime);
		        });
		    }
		    async mkdirPromise(p, opts) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.mkdirPromise(p, opts);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.mkdirPromise(subPath, opts);
		        });
		    }
		    mkdirSync(p, opts) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.mkdirSync(p, opts);
		        }, (zipFs, { subPath }) => {
		            return zipFs.mkdirSync(subPath, opts);
		        });
		    }
		    async rmdirPromise(p, opts) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.rmdirPromise(p, opts);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.rmdirPromise(subPath, opts);
		        });
		    }
		    rmdirSync(p, opts) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.rmdirSync(p, opts);
		        }, (zipFs, { subPath }) => {
		            return zipFs.rmdirSync(subPath, opts);
		        });
		    }
		    async linkPromise(existingP, newP) {
		        return await this.makeCallPromise(newP, async () => {
		            return await this.baseFs.linkPromise(existingP, newP);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.linkPromise(existingP, subPath);
		        });
		    }
		    linkSync(existingP, newP) {
		        return this.makeCallSync(newP, () => {
		            return this.baseFs.linkSync(existingP, newP);
		        }, (zipFs, { subPath }) => {
		            return zipFs.linkSync(existingP, subPath);
		        });
		    }
		    async symlinkPromise(target, p, type) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.symlinkPromise(target, p, type);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.symlinkPromise(target, subPath);
		        });
		    }
		    symlinkSync(target, p, type) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.symlinkSync(target, p, type);
		        }, (zipFs, { subPath }) => {
		            return zipFs.symlinkSync(target, subPath);
		        });
		    }
		    async readFilePromise(p, encoding) {
		        return this.makeCallPromise(p, async () => {
		            // This weird switch is required to tell TypeScript that the signatures are proper (otherwise it thinks that only the generic one is covered)
		            switch (encoding) {
		                case `utf8`:
		                    return await this.baseFs.readFilePromise(p, encoding);
		                default:
		                    return await this.baseFs.readFilePromise(p, encoding);
		            }
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.readFilePromise(subPath, encoding);
		        });
		    }
		    readFileSync(p, encoding) {
		        return this.makeCallSync(p, () => {
		            // This weird switch is required to tell TypeScript that the signatures are proper (otherwise it thinks that only the generic one is covered)
		            switch (encoding) {
		                case `utf8`:
		                    return this.baseFs.readFileSync(p, encoding);
		                default:
		                    return this.baseFs.readFileSync(p, encoding);
		            }
		        }, (zipFs, { subPath }) => {
		            return zipFs.readFileSync(subPath, encoding);
		        });
		    }
		    async readdirPromise(p, opts) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.readdirPromise(p, opts);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.readdirPromise(subPath, opts);
		        }, {
		            requireSubpath: false,
		        });
		    }
		    readdirSync(p, opts) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.readdirSync(p, opts);
		        }, (zipFs, { subPath }) => {
		            return zipFs.readdirSync(subPath, opts);
		        }, {
		            requireSubpath: false,
		        });
		    }
		    async readlinkPromise(p) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.readlinkPromise(p);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.readlinkPromise(subPath);
		        });
		    }
		    readlinkSync(p) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.readlinkSync(p);
		        }, (zipFs, { subPath }) => {
		            return zipFs.readlinkSync(subPath);
		        });
		    }
		    async truncatePromise(p, len) {
		        return await this.makeCallPromise(p, async () => {
		            return await this.baseFs.truncatePromise(p, len);
		        }, async (zipFs, { subPath }) => {
		            return await zipFs.truncatePromise(subPath, len);
		        });
		    }
		    truncateSync(p, len) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.truncateSync(p, len);
		        }, (zipFs, { subPath }) => {
		            return zipFs.truncateSync(subPath, len);
		        });
		    }
		    async ftruncatePromise(fd, len) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC)
		            return this.baseFs.ftruncatePromise(fd, len);
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`ftruncate`);
		        const [zipFs, realFd] = entry;
		        return zipFs.ftruncatePromise(realFd, len);
		    }
		    ftruncateSync(fd, len) {
		        if ((fd & ZIP_MASK) !== ZIP_MAGIC)
		            return this.baseFs.ftruncateSync(fd, len);
		        const entry = this.fdMap.get(fd);
		        if (typeof entry === `undefined`)
		            throw errors.EBADF(`ftruncateSync`);
		        const [zipFs, realFd] = entry;
		        return zipFs.ftruncateSync(realFd, len);
		    }
		    watch(p, a, b) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.watch(p, 
		            // @ts-expect-error
		            a, b);
		        }, (zipFs, { subPath }) => {
		            return zipFs.watch(subPath, 
		            // @ts-expect-error
		            a, b);
		        });
		    }
		    watchFile(p, a, b) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.watchFile(p, 
		            // @ts-expect-error
		            a, b);
		        }, () => {
		            return (0, watchFile_1.watchFile)(this, p, a, b);
		        });
		    }
		    unwatchFile(p, cb) {
		        return this.makeCallSync(p, () => {
		            return this.baseFs.unwatchFile(p, cb);
		        }, () => {
		            return (0, watchFile_1.unwatchFile)(this, p, cb);
		        });
		    }
		    async makeCallPromise(p, discard, accept, { requireSubpath = true } = {}) {
		        if (typeof p !== `string`)
		            return await discard();
		        const normalizedP = this.resolve(p);
		        const zipInfo = this.findZip(normalizedP);
		        if (!zipInfo)
		            return await discard();
		        if (requireSubpath && zipInfo.subPath === `/`)
		            return await discard();
		        return await this.getZipPromise(zipInfo.archivePath, async (zipFs) => await accept(zipFs, zipInfo));
		    }
		    makeCallSync(p, discard, accept, { requireSubpath = true } = {}) {
		        if (typeof p !== `string`)
		            return discard();
		        const normalizedP = this.resolve(p);
		        const zipInfo = this.findZip(normalizedP);
		        if (!zipInfo)
		            return discard();
		        if (requireSubpath && zipInfo.subPath === `/`)
		            return discard();
		        return this.getZipSync(zipInfo.archivePath, zipFs => accept(zipFs, zipInfo));
		    }
		    findZip(p) {
		        if (this.filter && !this.filter.test(p))
		            return null;
		        let filePath = ``;
		        while (true) {
		            const pathPartWithArchive = p.substring(filePath.length);
		            let archivePart;
		            if (!this.fileExtensions) {
		                archivePart = (0, exports.getArchivePart)(pathPartWithArchive, `.zip`);
		            }
		            else {
		                for (const ext of this.fileExtensions) {
		                    archivePart = (0, exports.getArchivePart)(pathPartWithArchive, ext);
		                    if (archivePart) {
		                        break;
		                    }
		                }
		            }
		            if (!archivePart)
		                return null;
		            filePath = this.pathUtils.join(filePath, archivePart);
		            if (this.isZip.has(filePath) === false) {
		                if (this.notZip.has(filePath))
		                    continue;
		                try {
		                    if (!this.baseFs.lstatSync(filePath).isFile()) {
		                        this.notZip.add(filePath);
		                        continue;
		                    }
		                }
		                catch {
		                    return null;
		                }
		                this.isZip.add(filePath);
		            }
		            return {
		                archivePath: filePath,
		                subPath: this.pathUtils.join(path_1.PortablePath.root, p.substring(filePath.length)),
		            };
		        }
		    }
		    limitOpenFiles(max) {
		        if (this.zipInstances === null)
		            return;
		        const now = Date.now();
		        let nextExpiresAt = now + this.maxAge;
		        let closeCount = max === null ? 0 : this.zipInstances.size - max;
		        for (const [path, { zipFs, expiresAt, refCount }] of this.zipInstances.entries()) {
		            if (refCount !== 0 || zipFs.hasOpenFileHandles()) {
		                continue;
		            }
		            else if (now >= expiresAt) {
		                zipFs.saveAndClose();
		                this.zipInstances.delete(path);
		                closeCount -= 1;
		                continue;
		            }
		            else if (max === null || closeCount <= 0) {
		                nextExpiresAt = expiresAt;
		                break;
		            }
		            zipFs.saveAndClose();
		            this.zipInstances.delete(path);
		            closeCount -= 1;
		        }
		        if (this.limitOpenFilesTimeout === null && ((max === null && this.zipInstances.size > 0) || max !== null)) {
		            this.limitOpenFilesTimeout = setTimeout(() => {
		                this.limitOpenFilesTimeout = null;
		                this.limitOpenFiles(null);
		            }, nextExpiresAt - now).unref();
		        }
		    }
		    async getZipPromise(p, accept) {
		        const getZipOptions = async () => ({
		            baseFs: this.baseFs,
		            libzip: this.libzip,
		            readOnly: this.readOnlyArchives,
		            stats: await this.baseFs.statPromise(p),
		        });
		        if (this.zipInstances) {
		            let cachedZipFs = this.zipInstances.get(p);
		            if (!cachedZipFs) {
		                const zipOptions = await getZipOptions();
		                // We need to recheck because concurrent getZipPromise calls may
		                // have instantiated the zip archive while we were waiting
		                cachedZipFs = this.zipInstances.get(p);
		                if (!cachedZipFs) {
		                    cachedZipFs = {
		                        zipFs: new ZipFS_1.ZipFS(p, zipOptions),
		                        expiresAt: 0,
		                        refCount: 0,
		                    };
		                }
		            }
		            // Removing then re-adding the field allows us to easily implement
		            // a basic LRU garbage collection strategy
		            this.zipInstances.delete(p);
		            this.limitOpenFiles(this.maxOpenFiles - 1);
		            this.zipInstances.set(p, cachedZipFs);
		            cachedZipFs.expiresAt = Date.now() + this.maxAge;
		            cachedZipFs.refCount += 1;
		            try {
		                return await accept(cachedZipFs.zipFs);
		            }
		            finally {
		                cachedZipFs.refCount -= 1;
		            }
		        }
		        else {
		            const zipFs = new ZipFS_1.ZipFS(p, await getZipOptions());
		            try {
		                return await accept(zipFs);
		            }
		            finally {
		                zipFs.saveAndClose();
		            }
		        }
		    }
		    getZipSync(p, accept) {
		        const getZipOptions = () => ({
		            baseFs: this.baseFs,
		            libzip: this.libzip,
		            readOnly: this.readOnlyArchives,
		            stats: this.baseFs.statSync(p),
		        });
		        if (this.zipInstances) {
		            let cachedZipFs = this.zipInstances.get(p);
		            if (!cachedZipFs) {
		                cachedZipFs = {
		                    zipFs: new ZipFS_1.ZipFS(p, getZipOptions()),
		                    expiresAt: 0,
		                    refCount: 0,
		                };
		            }
		            // Removing then re-adding the field allows us to easily implement
		            // a basic LRU garbage collection strategy
		            this.zipInstances.delete(p);
		            this.limitOpenFiles(this.maxOpenFiles - 1);
		            this.zipInstances.set(p, cachedZipFs);
		            cachedZipFs.expiresAt = Date.now() + this.maxAge;
		            return accept(cachedZipFs.zipFs);
		        }
		        else {
		            const zipFs = new ZipFS_1.ZipFS(p, getZipOptions());
		            try {
		                return accept(zipFs);
		            }
		            finally {
		                zipFs.saveAndClose();
		            }
		        }
		    }
		}
		exports.ZipOpenFS = ZipOpenFS;
} (ZipOpenFS));
	return ZipOpenFS;
}

var patchFs = {};

var NodePathFS = {};

var hasRequiredNodePathFS;

function requireNodePathFS () {
	if (hasRequiredNodePathFS) return NodePathFS;
	hasRequiredNodePathFS = 1;
	Object.defineProperty(NodePathFS, "__esModule", { value: true });
	NodePathFS.NodePathFS = void 0;
	const url_1 = require$$0$1;
	const util_1 = require$$1;
	const ProxiedFS_1 = requireProxiedFS();
	const path_1 = requirePath();
	/**
	 * Adds support for file URLs and Buffers to the wrapped `baseFs`, but *not* inside the typings.
	 *
	 * Only exists for compatibility with Node's behavior.
	 *
	 * Automatically wraps all FS instances passed to `patchFs` & `extendFs`.
	 *
	 * Don't use it!
	 */
	let NodePathFS$1 = class NodePathFS extends ProxiedFS_1.ProxiedFS {
	    constructor(baseFs) {
	        super(path_1.npath);
	        this.baseFs = baseFs;
	    }
	    mapFromBase(path) {
	        return path;
	    }
	    mapToBase(path) {
	        if (typeof path === `string`)
	            return path;
	        if (path instanceof url_1.URL)
	            return (0, url_1.fileURLToPath)(path);
	        if (Buffer.isBuffer(path)) {
	            const str = path.toString();
	            if (Buffer.byteLength(str) !== path.byteLength)
	                throw new Error(`Non-utf8 buffers are not supported at the moment. Please upvote the following issue if you encounter this error: https://github.com/yarnpkg/berry/issues/4942`);
	            return str;
	        }
	        throw new Error(`Unsupported path type: ${(0, util_1.inspect)(path)}`);
	    }
	};
	NodePathFS.NodePathFS = NodePathFS$1;
	return NodePathFS;
}

var FileHandle = {};

var hasRequiredFileHandle;

function requireFileHandle () {
	if (hasRequiredFileHandle) return FileHandle;
	hasRequiredFileHandle = 1;
	var _a, _b, _c, _d;
	Object.defineProperty(FileHandle, "__esModule", { value: true });
	FileHandle.FileHandle = void 0;
	const readline_1 = require$$0$2;
	const kBaseFs = Symbol(`kBaseFs`);
	const kFd = Symbol(`kFd`);
	const kClosePromise = Symbol(`kClosePromise`);
	const kCloseResolve = Symbol(`kCloseResolve`);
	const kCloseReject = Symbol(`kCloseReject`);
	const kRefs = Symbol(`kRefs`);
	const kRef = Symbol(`kRef`);
	const kUnref = Symbol(`kUnref`);
	let FileHandle$1 = class FileHandle {
	    constructor(fd, baseFs) {
	        this[_a] = 1;
	        this[_b] = undefined;
	        this[_c] = undefined;
	        this[_d] = undefined;
	        this[kBaseFs] = baseFs;
	        this[kFd] = fd;
	    }
	    get fd() {
	        return this[kFd];
	    }
	    async appendFile(data, options) {
	        var _e;
	        try {
	            this[kRef](this.appendFile);
	            const encoding = (_e = (typeof options === `string` ? options : options === null || options === void 0 ? void 0 : options.encoding)) !== null && _e !== void 0 ? _e : undefined;
	            return await this[kBaseFs].appendFilePromise(this.fd, data, encoding ? { encoding } : undefined);
	        }
	        finally {
	            this[kUnref]();
	        }
	    }
	    async chown(uid, gid) {
	        try {
	            this[kRef](this.chown);
	            return await this[kBaseFs].fchownPromise(this.fd, uid, gid);
	        }
	        finally {
	            this[kUnref]();
	        }
	    }
	    async chmod(mode) {
	        try {
	            this[kRef](this.chmod);
	            return await this[kBaseFs].fchmodPromise(this.fd, mode);
	        }
	        finally {
	            this[kUnref]();
	        }
	    }
	    createReadStream(options) {
	        return this[kBaseFs].createReadStream(null, { ...options, fd: this.fd });
	    }
	    createWriteStream(options) {
	        return this[kBaseFs].createWriteStream(null, { ...options, fd: this.fd });
	    }
	    // FIXME: Missing FakeFS version
	    datasync() {
	        throw new Error(`Method not implemented.`);
	    }
	    // FIXME: Missing FakeFS version
	    sync() {
	        throw new Error(`Method not implemented.`);
	    }
	    async read(bufferOrOptions, offset, length, position) {
	        var _e, _f, _g;
	        try {
	            this[kRef](this.read);
	            let buffer;
	            if (!Buffer.isBuffer(bufferOrOptions)) {
	                bufferOrOptions !== null && bufferOrOptions !== void 0 ? bufferOrOptions : (bufferOrOptions = {});
	                buffer = (_e = bufferOrOptions.buffer) !== null && _e !== void 0 ? _e : Buffer.alloc(16384);
	                offset = bufferOrOptions.offset || 0;
	                length = (_f = bufferOrOptions.length) !== null && _f !== void 0 ? _f : buffer.byteLength;
	                position = (_g = bufferOrOptions.position) !== null && _g !== void 0 ? _g : null;
	            }
	            else {
	                buffer = bufferOrOptions;
	            }
	            offset !== null && offset !== void 0 ? offset : (offset = 0);
	            length !== null && length !== void 0 ? length : (length = 0);
	            if (length === 0) {
	                return {
	                    bytesRead: length,
	                    buffer,
	                };
	            }
	            const bytesRead = await this[kBaseFs].readPromise(this.fd, buffer, offset, length, position);
	            return {
	                bytesRead,
	                buffer,
	            };
	        }
	        finally {
	            this[kUnref]();
	        }
	    }
	    async readFile(options) {
	        var _e;
	        try {
	            this[kRef](this.readFile);
	            const encoding = (_e = (typeof options === `string` ? options : options === null || options === void 0 ? void 0 : options.encoding)) !== null && _e !== void 0 ? _e : undefined;
	            return await this[kBaseFs].readFilePromise(this.fd, encoding);
	        }
	        finally {
	            this[kUnref]();
	        }
	    }
	    readLines(options) {
	        return (0, readline_1.createInterface)({
	            input: this.createReadStream(options),
	            crlfDelay: Infinity,
	        });
	    }
	    async stat(opts) {
	        try {
	            this[kRef](this.stat);
	            return await this[kBaseFs].fstatPromise(this.fd, opts);
	        }
	        finally {
	            this[kUnref]();
	        }
	    }
	    async truncate(len) {
	        try {
	            this[kRef](this.truncate);
	            return await this[kBaseFs].ftruncatePromise(this.fd, len);
	        }
	        finally {
	            this[kUnref]();
	        }
	    }
	    // FIXME: Missing FakeFS version
	    utimes(atime, mtime) {
	        throw new Error(`Method not implemented.`);
	    }
	    async writeFile(data, options) {
	        var _e;
	        try {
	            this[kRef](this.writeFile);
	            const encoding = (_e = (typeof options === `string` ? options : options === null || options === void 0 ? void 0 : options.encoding)) !== null && _e !== void 0 ? _e : undefined;
	            await this[kBaseFs].writeFilePromise(this.fd, data, encoding);
	        }
	        finally {
	            this[kUnref]();
	        }
	    }
	    async write(...args) {
	        try {
	            this[kRef](this.write);
	            if (ArrayBuffer.isView(args[0])) {
	                const [buffer, offset, length, position] = args;
	                const bytesWritten = await this[kBaseFs].writePromise(this.fd, buffer, offset !== null && offset !== void 0 ? offset : undefined, length !== null && length !== void 0 ? length : undefined, position !== null && position !== void 0 ? position : undefined);
	                return { bytesWritten, buffer };
	            }
	            else {
	                const [data, position, encoding] = args;
	                // @ts-expect-error - FIXME: Types/implementation need to be updated in FakeFS
	                const bytesWritten = await this[kBaseFs].writePromise(this.fd, data, position, encoding);
	                return { bytesWritten, buffer: data };
	            }
	        }
	        finally {
	            this[kUnref]();
	        }
	    }
	    // TODO: Use writev from FakeFS when that is implemented
	    async writev(buffers, position) {
	        try {
	            this[kRef](this.writev);
	            let bytesWritten = 0;
	            if (typeof position !== `undefined`) {
	                for (const buffer of buffers) {
	                    const writeResult = await this.write(buffer, undefined, undefined, position);
	                    bytesWritten += writeResult.bytesWritten;
	                    position += writeResult.bytesWritten;
	                }
	            }
	            else {
	                for (const buffer of buffers) {
	                    const writeResult = await this.write(buffer);
	                    bytesWritten += writeResult.bytesWritten;
	                }
	            }
	            return {
	                buffers,
	                bytesWritten,
	            };
	        }
	        finally {
	            this[kUnref]();
	        }
	    }
	    // FIXME: Missing FakeFS version
	    readv(buffers, position) {
	        throw new Error(`Method not implemented.`);
	    }
	    close() {
	        if (this[kFd] === -1)
	            return Promise.resolve();
	        if (this[kClosePromise])
	            return this[kClosePromise];
	        this[kRefs]--;
	        if (this[kRefs] === 0) {
	            const fd = this[kFd];
	            this[kFd] = -1;
	            this[kClosePromise] = this[kBaseFs].closePromise(fd).finally(() => {
	                this[kClosePromise] = undefined;
	            });
	        }
	        else {
	            this[kClosePromise] =
	                new Promise((resolve, reject) => {
	                    this[kCloseResolve] = resolve;
	                    this[kCloseReject] = reject;
	                }).finally(() => {
	                    this[kClosePromise] = undefined;
	                    this[kCloseReject] = undefined;
	                    this[kCloseResolve] = undefined;
	                });
	        }
	        return this[kClosePromise];
	    }
	    [(_a = kRefs, _b = kClosePromise, _c = kCloseResolve, _d = kCloseReject, kRef)](caller) {
	        if (this[kFd] === -1) {
	            const err = new Error(`file closed`);
	            err.code = `EBADF`;
	            err.syscall = caller.name;
	            throw err;
	        }
	        this[kRefs]++;
	    }
	    [kUnref]() {
	        this[kRefs]--;
	        if (this[kRefs] === 0) {
	            const fd = this[kFd];
	            this[kFd] = -1;
	            this[kBaseFs].closePromise(fd).then(this[kCloseResolve], this[kCloseReject]);
	        }
	    }
	};
	FileHandle.FileHandle = FileHandle$1;
	return FileHandle;
}

var hasRequiredPatchFs;

function requirePatchFs () {
	if (hasRequiredPatchFs) return patchFs;
	hasRequiredPatchFs = 1;
	Object.defineProperty(patchFs, "__esModule", { value: true });
	patchFs.extendFs = patchFs.patchFs = void 0;
	const util_1 = require$$1;
	const NodePathFS_1 = requireNodePathFS();
	const FileHandle_1 = requireFileHandle();
	const SYNC_IMPLEMENTATIONS = new Set([
	    `accessSync`,
	    `appendFileSync`,
	    `createReadStream`,
	    `createWriteStream`,
	    `chmodSync`,
	    `fchmodSync`,
	    `chownSync`,
	    `fchownSync`,
	    `closeSync`,
	    `copyFileSync`,
	    `linkSync`,
	    `lstatSync`,
	    `fstatSync`,
	    `lutimesSync`,
	    `mkdirSync`,
	    `openSync`,
	    `opendirSync`,
	    `readlinkSync`,
	    `readFileSync`,
	    `readdirSync`,
	    `readlinkSync`,
	    `realpathSync`,
	    `renameSync`,
	    `rmdirSync`,
	    `statSync`,
	    `symlinkSync`,
	    `truncateSync`,
	    `ftruncateSync`,
	    `unlinkSync`,
	    `unwatchFile`,
	    `utimesSync`,
	    `watch`,
	    `watchFile`,
	    `writeFileSync`,
	    `writeSync`,
	]);
	const ASYNC_IMPLEMENTATIONS = new Set([
	    `accessPromise`,
	    `appendFilePromise`,
	    `fchmodPromise`,
	    `chmodPromise`,
	    `fchownPromise`,
	    `chownPromise`,
	    `closePromise`,
	    `copyFilePromise`,
	    `linkPromise`,
	    `fstatPromise`,
	    `lstatPromise`,
	    `lutimesPromise`,
	    `mkdirPromise`,
	    `openPromise`,
	    `opendirPromise`,
	    `readdirPromise`,
	    `realpathPromise`,
	    `readFilePromise`,
	    `readdirPromise`,
	    `readlinkPromise`,
	    `renamePromise`,
	    `rmdirPromise`,
	    `statPromise`,
	    `symlinkPromise`,
	    `truncatePromise`,
	    `ftruncatePromise`,
	    `unlinkPromise`,
	    `utimesPromise`,
	    `writeFilePromise`,
	    `writeSync`,
	]);
	//#endregion
	function patchFs$1(patchedFs, fakeFs) {
	    // We wrap the `fakeFs` with a `NodePathFS` to add support for all path types supported by Node
	    fakeFs = new NodePathFS_1.NodePathFS(fakeFs);
	    const setupFn = (target, name, replacement) => {
	        const orig = target[name];
	        target[name] = replacement;
	        // Preserve any util.promisify implementations
	        if (typeof (orig === null || orig === void 0 ? void 0 : orig[util_1.promisify.custom]) !== `undefined`) {
	            replacement[util_1.promisify.custom] = orig[util_1.promisify.custom];
	        }
	    };
	    /** Callback implementations */
	    {
	        setupFn(patchedFs, `exists`, (p, ...args) => {
	            const hasCallback = typeof args[args.length - 1] === `function`;
	            const callback = hasCallback ? args.pop() : () => { };
	            process.nextTick(() => {
	                fakeFs.existsPromise(p).then(exists => {
	                    callback(exists);
	                }, () => {
	                    callback(false);
	                });
	            });
	        });
	        // Adapted from https://github.com/nodejs/node/blob/e5c1fd7a2a1801fd75bdde23b260488e85453eb2/lib/fs.js#L603-L667
	        setupFn(patchedFs, `read`, (...args) => {
	            let [fd, buffer, offset, length, position, callback] = args;
	            if (args.length <= 3) {
	                // Assume fs.read(fd, options, callback)
	                let options = {};
	                if (args.length < 3) {
	                    // This is fs.read(fd, callback)
	                    callback = args[1];
	                }
	                else {
	                    // This is fs.read(fd, {}, callback)
	                    options = args[1];
	                    callback = args[2];
	                }
	                ({
	                    buffer = Buffer.alloc(16384),
	                    offset = 0,
	                    length = buffer.byteLength,
	                    position,
	                } = options);
	            }
	            if (offset == null)
	                offset = 0;
	            length |= 0;
	            if (length === 0) {
	                process.nextTick(() => {
	                    callback(null, 0, buffer);
	                });
	                return;
	            }
	            if (position == null)
	                position = -1;
	            process.nextTick(() => {
	                fakeFs.readPromise(fd, buffer, offset, length, position).then(bytesRead => {
	                    callback(null, bytesRead, buffer);
	                }, error => {
	                    // https://github.com/nodejs/node/blob/1317252dfe8824fd9cfee125d2aaa94004db2f3b/lib/fs.js#L655-L658
	                    // Known issue: bytesRead could theoretically be > than 0, but we currently always return 0
	                    callback(error, 0, buffer);
	                });
	            });
	        });
	        for (const fnName of ASYNC_IMPLEMENTATIONS) {
	            const origName = fnName.replace(/Promise$/, ``);
	            if (typeof patchedFs[origName] === `undefined`)
	                continue;
	            const fakeImpl = fakeFs[fnName];
	            if (typeof fakeImpl === `undefined`)
	                continue;
	            const wrapper = (...args) => {
	                const hasCallback = typeof args[args.length - 1] === `function`;
	                const callback = hasCallback ? args.pop() : () => { };
	                process.nextTick(() => {
	                    fakeImpl.apply(fakeFs, args).then((result) => {
	                        callback(null, result);
	                    }, (error) => {
	                        callback(error);
	                    });
	                });
	            };
	            setupFn(patchedFs, origName, wrapper);
	        }
	        patchedFs.realpath.native = patchedFs.realpath;
	    }
	    /** Sync implementations */
	    {
	        setupFn(patchedFs, `existsSync`, (p) => {
	            try {
	                return fakeFs.existsSync(p);
	            }
	            catch (error) {
	                return false;
	            }
	        });
	        // Adapted from https://github.com/nodejs/node/blob/e5c1fd7a2a1801fd75bdde23b260488e85453eb2/lib/fs.js#L684-L725
	        setupFn(patchedFs, `readSync`, (...args) => {
	            let [fd, buffer, offset, length, position] = args;
	            if (args.length <= 3) {
	                // Assume fs.read(fd, buffer, options)
	                const options = args[2] || {};
	                ({ offset = 0, length = buffer.byteLength, position } = options);
	            }
	            if (offset == null)
	                offset = 0;
	            length |= 0;
	            if (length === 0)
	                return 0;
	            if (position == null)
	                position = -1;
	            return fakeFs.readSync(fd, buffer, offset, length, position);
	        });
	        for (const fnName of SYNC_IMPLEMENTATIONS) {
	            const origName = fnName;
	            if (typeof patchedFs[origName] === `undefined`)
	                continue;
	            const fakeImpl = fakeFs[fnName];
	            if (typeof fakeImpl === `undefined`)
	                continue;
	            setupFn(patchedFs, origName, fakeImpl.bind(fakeFs));
	        }
	        patchedFs.realpathSync.native = patchedFs.realpathSync;
	    }
	    /** Promise implementations */
	    {
	        // `fs.promises` is a getter that returns a reference to require(`fs/promises`),
	        // so we can just patch `fs.promises` and both will be updated
	        const origEmitWarning = process.emitWarning;
	        process.emitWarning = () => { };
	        let patchedFsPromises;
	        try {
	            patchedFsPromises = patchedFs.promises;
	        }
	        finally {
	            process.emitWarning = origEmitWarning;
	        }
	        if (typeof patchedFsPromises !== `undefined`) {
	            // `fs.promises.exists` doesn't exist
	            for (const fnName of ASYNC_IMPLEMENTATIONS) {
	                const origName = fnName.replace(/Promise$/, ``);
	                if (typeof patchedFsPromises[origName] === `undefined`)
	                    continue;
	                const fakeImpl = fakeFs[fnName];
	                if (typeof fakeImpl === `undefined`)
	                    continue;
	                // Open is a bit particular with fs.promises: it returns a file handle
	                // instance instead of the traditional file descriptor number
	                if (fnName === `open`)
	                    continue;
	                setupFn(patchedFsPromises, origName, (pathLike, ...args) => {
	                    if (pathLike instanceof FileHandle_1.FileHandle) {
	                        return pathLike[origName].apply(pathLike, args);
	                    }
	                    else {
	                        return fakeImpl.call(fakeFs, pathLike, ...args);
	                    }
	                });
	            }
	            setupFn(patchedFsPromises, `open`, async (...args) => {
	                // @ts-expect-error
	                const fd = await fakeFs.openPromise(...args);
	                return new FileHandle_1.FileHandle(fd, fakeFs);
	            });
	            // `fs.promises.realpath` doesn't have a `native` property
	        }
	    }
	    /** util.promisify implementations */
	    {
	        // TODO add promisified `fs.readv` and `fs.writev`, once they are implemented
	        // Override the promisified versions of `fs.read` and `fs.write` to return an object as per
	        // https://github.com/nodejs/node/blob/dc79f3f37caf6f25b8efee4623bec31e2c20f595/lib/fs.js#L559-L560
	        // and
	        // https://github.com/nodejs/node/blob/dc79f3f37caf6f25b8efee4623bec31e2c20f595/lib/fs.js#L690-L691
	        // and
	        // https://github.com/nodejs/node/blob/ba684805b6c0eded76e5cd89ee00328ac7a59365/lib/internal/util.js#L293
	        // @ts-expect-error
	        patchedFs.read[util_1.promisify.custom] = async (fd, buffer, ...args) => {
	            const res = fakeFs.readPromise(fd, buffer, ...args);
	            return { bytesRead: await res, buffer };
	        };
	        // @ts-expect-error
	        patchedFs.write[util_1.promisify.custom] = async (fd, buffer, ...args) => {
	            const res = fakeFs.writePromise(fd, buffer, ...args);
	            return { bytesWritten: await res, buffer };
	        };
	    }
	}
	patchFs.patchFs = patchFs$1;
	function extendFs(realFs, fakeFs) {
	    const patchedFs = Object.create(realFs);
	    patchFs$1(patchedFs, fakeFs);
	    return patchedFs;
	}
	patchFs.extendFs = extendFs;
	return patchFs;
}

var xfs = {};

var hasRequiredXfs;

function requireXfs () {
	if (hasRequiredXfs) return xfs;
	hasRequiredXfs = 1;
	(function (exports) {
		Object.defineProperty(exports, "__esModule", { value: true });
		exports.xfs = void 0;
		const tslib_1 = tslib_es6;
		const os_1 = tslib_1.__importDefault(require$$0);
		const NodeFS_1 = requireNodeFS();
		const path_1 = requirePath();
		function getTempName(prefix) {
		    const hash = Math.ceil(Math.random() * 0x100000000).toString(16).padStart(8, `0`);
		    return `${prefix}${hash}`;
		}
		const tmpdirs = new Set();
		let tmpEnv = null;
		function initTmpEnv() {
		    if (tmpEnv)
		        return tmpEnv;
		    const tmpdir = path_1.npath.toPortablePath(os_1.default.tmpdir());
		    const realTmpdir = exports.xfs.realpathSync(tmpdir);
		    process.once(`exit`, () => {
		        exports.xfs.rmtempSync();
		    });
		    return tmpEnv = {
		        tmpdir,
		        realTmpdir,
		    };
		}
		exports.xfs = Object.assign(new NodeFS_1.NodeFS(), {
		    detachTemp(p) {
		        tmpdirs.delete(p);
		    },
		    mktempSync(cb) {
		        const { tmpdir, realTmpdir } = initTmpEnv();
		        while (true) {
		            const name = getTempName(`xfs-`);
		            try {
		                this.mkdirSync(path_1.ppath.join(tmpdir, name));
		            }
		            catch (error) {
		                if (error.code === `EEXIST`) {
		                    continue;
		                }
		                else {
		                    throw error;
		                }
		            }
		            const realP = path_1.ppath.join(realTmpdir, name);
		            tmpdirs.add(realP);
		            if (typeof cb === `undefined`)
		                return realP;
		            try {
		                return cb(realP);
		            }
		            finally {
		                if (tmpdirs.has(realP)) {
		                    tmpdirs.delete(realP);
		                    try {
		                        this.removeSync(realP);
		                    }
		                    catch {
		                        // Too bad if there's an error
		                    }
		                }
		            }
		        }
		    },
		    async mktempPromise(cb) {
		        const { tmpdir, realTmpdir } = initTmpEnv();
		        while (true) {
		            const name = getTempName(`xfs-`);
		            try {
		                await this.mkdirPromise(path_1.ppath.join(tmpdir, name));
		            }
		            catch (error) {
		                if (error.code === `EEXIST`) {
		                    continue;
		                }
		                else {
		                    throw error;
		                }
		            }
		            const realP = path_1.ppath.join(realTmpdir, name);
		            tmpdirs.add(realP);
		            if (typeof cb === `undefined`)
		                return realP;
		            try {
		                return await cb(realP);
		            }
		            finally {
		                if (tmpdirs.has(realP)) {
		                    tmpdirs.delete(realP);
		                    try {
		                        await this.removePromise(realP);
		                    }
		                    catch {
		                        // Too bad if there's an error
		                    }
		                }
		            }
		        }
		    },
		    async rmtempPromise() {
		        await Promise.all(Array.from(tmpdirs.values()).map(async (p) => {
		            try {
		                await exports.xfs.removePromise(p, { maxRetries: 0 });
		                tmpdirs.delete(p);
		            }
		            catch {
		                // Too bad if there's an error
		            }
		        }));
		    },
		    rmtempSync() {
		        for (const p of tmpdirs) {
		            try {
		                exports.xfs.removeSync(p);
		                tmpdirs.delete(p);
		            }
		            catch {
		                // Too bad if there's an error
		            }
		        }
		    },
		});
} (xfs));
	return xfs;
}

(function (exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	exports.xfs = exports.extendFs = exports.patchFs = exports.ZipOpenFS = exports.ZipFS = exports.VirtualFS = exports.ProxiedFS = exports.PosixFS = exports.NodeFS = exports.NoFS = exports.LazyFS = exports.JailFS = exports.CwdFS = exports.FakeFS = exports.AliasFS = exports.toFilename = exports.ppath = exports.npath = exports.Filename = exports.PortablePath = exports.DEFAULT_COMPRESSION_LEVEL = exports.normalizeLineEndings = exports.statUtils = exports.opendir = exports.LinkStrategy = exports.constants = void 0;
	const tslib_1 = tslib_es6;
	const constants = tslib_1.__importStar(requireConstants());
	exports.constants = constants;
	const statUtils = tslib_1.__importStar(requireStatUtils());
	exports.statUtils = statUtils;
	var copyPromise_1 = requireCopyPromise();
	Object.defineProperty(exports, "LinkStrategy", { enumerable: true, get: function () { return copyPromise_1.LinkStrategy; } });
	var opendir_1 = requireOpendir();
	Object.defineProperty(exports, "opendir", { enumerable: true, get: function () { return opendir_1.opendir; } });
	var FakeFS_1 = requireFakeFS();
	Object.defineProperty(exports, "normalizeLineEndings", { enumerable: true, get: function () { return FakeFS_1.normalizeLineEndings; } });
	var ZipFS_1 = requireZipFS();
	Object.defineProperty(exports, "DEFAULT_COMPRESSION_LEVEL", { enumerable: true, get: function () { return ZipFS_1.DEFAULT_COMPRESSION_LEVEL; } });
	var path_1 = requirePath();
	Object.defineProperty(exports, "PortablePath", { enumerable: true, get: function () { return path_1.PortablePath; } });
	Object.defineProperty(exports, "Filename", { enumerable: true, get: function () { return path_1.Filename; } });
	var path_2 = requirePath();
	Object.defineProperty(exports, "npath", { enumerable: true, get: function () { return path_2.npath; } });
	Object.defineProperty(exports, "ppath", { enumerable: true, get: function () { return path_2.ppath; } });
	Object.defineProperty(exports, "toFilename", { enumerable: true, get: function () { return path_2.toFilename; } });
	var AliasFS_1 = requireAliasFS();
	Object.defineProperty(exports, "AliasFS", { enumerable: true, get: function () { return AliasFS_1.AliasFS; } });
	var FakeFS_2 = requireFakeFS();
	Object.defineProperty(exports, "FakeFS", { enumerable: true, get: function () { return FakeFS_2.FakeFS; } });
	var CwdFS_1 = requireCwdFS();
	Object.defineProperty(exports, "CwdFS", { enumerable: true, get: function () { return CwdFS_1.CwdFS; } });
	var JailFS_1 = requireJailFS();
	Object.defineProperty(exports, "JailFS", { enumerable: true, get: function () { return JailFS_1.JailFS; } });
	var LazyFS_1 = requireLazyFS();
	Object.defineProperty(exports, "LazyFS", { enumerable: true, get: function () { return LazyFS_1.LazyFS; } });
	var NoFS_1 = requireNoFS();
	Object.defineProperty(exports, "NoFS", { enumerable: true, get: function () { return NoFS_1.NoFS; } });
	var NodeFS_1 = requireNodeFS();
	Object.defineProperty(exports, "NodeFS", { enumerable: true, get: function () { return NodeFS_1.NodeFS; } });
	var PosixFS_1 = requirePosixFS();
	Object.defineProperty(exports, "PosixFS", { enumerable: true, get: function () { return PosixFS_1.PosixFS; } });
	var ProxiedFS_1 = requireProxiedFS();
	Object.defineProperty(exports, "ProxiedFS", { enumerable: true, get: function () { return ProxiedFS_1.ProxiedFS; } });
	var VirtualFS_1 = requireVirtualFS();
	Object.defineProperty(exports, "VirtualFS", { enumerable: true, get: function () { return VirtualFS_1.VirtualFS; } });
	var ZipFS_2 = requireZipFS();
	Object.defineProperty(exports, "ZipFS", { enumerable: true, get: function () { return ZipFS_2.ZipFS; } });
	var ZipOpenFS_1 = requireZipOpenFS();
	Object.defineProperty(exports, "ZipOpenFS", { enumerable: true, get: function () { return ZipOpenFS_1.ZipOpenFS; } });
	var patchFs_1 = requirePatchFs();
	Object.defineProperty(exports, "patchFs", { enumerable: true, get: function () { return patchFs_1.patchFs; } });
	Object.defineProperty(exports, "extendFs", { enumerable: true, get: function () { return patchFs_1.extendFs; } });
	var xfs_1 = requireXfs();
	Object.defineProperty(exports, "xfs", { enumerable: true, get: function () { return xfs_1.xfs; } });
} (lib));

const SAFE_TIME = 456789e3;

const defaultTime = new Date(SAFE_TIME * 1e3);
async function copyPromise(destinationFs, destination, sourceFs, source, opts) {
  const normalizedDestination = destinationFs.pathUtils.normalize(destination);
  const normalizedSource = sourceFs.pathUtils.normalize(source);
  const prelayout = [];
  const postlayout = [];
  const { atime, mtime } = opts.stableTime ? { atime: defaultTime, mtime: defaultTime } : await sourceFs.lstatPromise(normalizedSource);
  await destinationFs.mkdirpPromise(destinationFs.pathUtils.dirname(destination), { utimes: [atime, mtime] });
  const updateTime = typeof destinationFs.lutimesPromise === `function` ? destinationFs.lutimesPromise.bind(destinationFs) : destinationFs.utimesPromise.bind(destinationFs);
  await copyImpl(prelayout, postlayout, updateTime, destinationFs, normalizedDestination, sourceFs, normalizedSource, { ...opts, didParentExist: true });
  for (const operation of prelayout)
    await operation();
  await Promise.all(postlayout.map((operation) => {
    return operation();
  }));
}
async function copyImpl(prelayout, postlayout, updateTime, destinationFs, destination, sourceFs, source, opts) {
  var _a, _b;
  const destinationStat = opts.didParentExist ? await maybeLStat(destinationFs, destination) : null;
  const sourceStat = await sourceFs.lstatPromise(source);
  const { atime, mtime } = opts.stableTime ? { atime: defaultTime, mtime: defaultTime } : sourceStat;
  let updated;
  switch (true) {
    case sourceStat.isDirectory():
      {
        updated = await copyFolder(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
      }
      break;
    case sourceStat.isFile():
      {
        updated = await copyFile(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
      }
      break;
    case sourceStat.isSymbolicLink():
      {
        updated = await copySymlink(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts);
      }
      break;
    default:
      {
        throw new Error(`Unsupported file type (${sourceStat.mode})`);
      }
  }
  if (updated || ((_a = destinationStat == null ? void 0 : destinationStat.mtime) == null ? void 0 : _a.getTime()) !== mtime.getTime() || ((_b = destinationStat == null ? void 0 : destinationStat.atime) == null ? void 0 : _b.getTime()) !== atime.getTime()) {
    postlayout.push(() => updateTime(destination, atime, mtime));
    updated = true;
  }
  if (destinationStat === null || (destinationStat.mode & 511) !== (sourceStat.mode & 511)) {
    postlayout.push(() => destinationFs.chmodPromise(destination, sourceStat.mode & 511));
    updated = true;
  }
  return updated;
}
async function maybeLStat(baseFs, p) {
  try {
    return await baseFs.lstatPromise(p);
  } catch (e) {
    return null;
  }
}
async function copyFolder(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
  if (destinationStat !== null && !destinationStat.isDirectory()) {
    if (opts.overwrite) {
      prelayout.push(async () => destinationFs.removePromise(destination));
      destinationStat = null;
    } else {
      return false;
    }
  }
  let updated = false;
  if (destinationStat === null) {
    prelayout.push(async () => {
      try {
        await destinationFs.mkdirPromise(destination, { mode: sourceStat.mode });
      } catch (err) {
        if (err.code !== `EEXIST`) {
          throw err;
        }
      }
    });
    updated = true;
  }
  const entries = await sourceFs.readdirPromise(source);
  const nextOpts = opts.didParentExist && !destinationStat ? { ...opts, didParentExist: false } : opts;
  if (opts.stableSort) {
    for (const entry of entries.sort()) {
      if (await copyImpl(prelayout, postlayout, updateTime, destinationFs, destinationFs.pathUtils.join(destination, entry), sourceFs, sourceFs.pathUtils.join(source, entry), nextOpts)) {
        updated = true;
      }
    }
  } else {
    const entriesUpdateStatus = await Promise.all(entries.map(async (entry) => {
      await copyImpl(prelayout, postlayout, updateTime, destinationFs, destinationFs.pathUtils.join(destination, entry), sourceFs, sourceFs.pathUtils.join(source, entry), nextOpts);
    }));
    if (entriesUpdateStatus.some((status) => status)) {
      updated = true;
    }
  }
  return updated;
}
const isCloneSupportedCache = /* @__PURE__ */ new WeakMap();
function makeLinkOperation(opFs, destination, source, sourceStat, linkStrategy) {
  return async () => {
    await opFs.linkPromise(source, destination);
    if (linkStrategy === "readOnly" /* ReadOnly */) {
      sourceStat.mode &= ~146;
      await opFs.chmodPromise(destination, sourceStat.mode);
    }
  };
}
function makeCloneLinkOperation(opFs, destination, source, sourceStat, linkStrategy) {
  const isCloneSupported = isCloneSupportedCache.get(opFs);
  if (typeof isCloneSupported === `undefined`) {
    return async () => {
      try {
        await opFs.copyFilePromise(source, destination, fs.constants.COPYFILE_FICLONE_FORCE);
        isCloneSupportedCache.set(opFs, true);
      } catch (err) {
        if (err.code === `ENOSYS` || err.code === `ENOTSUP`) {
          isCloneSupportedCache.set(opFs, false);
          await makeLinkOperation(opFs, destination, source, sourceStat, linkStrategy)();
        } else {
          throw err;
        }
      }
    };
  } else {
    if (isCloneSupported) {
      return async () => opFs.copyFilePromise(source, destination, fs.constants.COPYFILE_FICLONE_FORCE);
    } else {
      return makeLinkOperation(opFs, destination, source, sourceStat, linkStrategy);
    }
  }
}
async function copyFile(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
  var _a;
  if (destinationStat !== null) {
    if (opts.overwrite) {
      prelayout.push(async () => destinationFs.removePromise(destination));
      destinationStat = null;
    } else {
      return false;
    }
  }
  const linkStrategy = (_a = opts.linkStrategy) != null ? _a : null;
  const op = destinationFs === sourceFs ? linkStrategy !== null ? makeCloneLinkOperation(destinationFs, destination, source, sourceStat, linkStrategy) : async () => destinationFs.copyFilePromise(source, destination, fs.constants.COPYFILE_FICLONE) : linkStrategy !== null ? makeLinkOperation(destinationFs, destination, source, sourceStat, linkStrategy) : async () => destinationFs.writeFilePromise(destination, await sourceFs.readFilePromise(source));
  prelayout.push(async () => op());
  return true;
}
async function copySymlink(prelayout, postlayout, updateTime, destinationFs, destination, destinationStat, sourceFs, source, sourceStat, opts) {
  if (destinationStat !== null) {
    if (opts.overwrite) {
      prelayout.push(async () => destinationFs.removePromise(destination));
      destinationStat = null;
    } else {
      return false;
    }
  }
  prelayout.push(async () => {
    await destinationFs.symlinkPromise(convertPath(destinationFs.pathUtils, await sourceFs.readlinkPromise(source)), destination);
  });
  return true;
}

class FakeFS {
  constructor(pathUtils) {
    this.pathUtils = pathUtils;
  }
  async *genTraversePromise(init, { stableSort = false } = {}) {
    const stack = [init];
    while (stack.length > 0) {
      const p = stack.shift();
      const entry = await this.lstatPromise(p);
      if (entry.isDirectory()) {
        const entries = await this.readdirPromise(p);
        if (stableSort) {
          for (const entry2 of entries.sort()) {
            stack.push(this.pathUtils.join(p, entry2));
          }
        } else {
          throw new Error(`Not supported`);
        }
      } else {
        yield p;
      }
    }
  }
  async removePromise(p, { recursive = true, maxRetries = 5 } = {}) {
    let stat;
    try {
      stat = await this.lstatPromise(p);
    } catch (error) {
      if (error.code === `ENOENT`) {
        return;
      } else {
        throw error;
      }
    }
    if (stat.isDirectory()) {
      if (recursive) {
        const entries = await this.readdirPromise(p);
        await Promise.all(entries.map((entry) => {
          return this.removePromise(this.pathUtils.resolve(p, entry));
        }));
      }
      for (let t = 0; t <= maxRetries; t++) {
        try {
          await this.rmdirPromise(p);
          break;
        } catch (error) {
          if (error.code !== `EBUSY` && error.code !== `ENOTEMPTY`) {
            throw error;
          } else if (t < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, t * 100));
          }
        }
      }
    } else {
      await this.unlinkPromise(p);
    }
  }
  removeSync(p, { recursive = true } = {}) {
    let stat;
    try {
      stat = this.lstatSync(p);
    } catch (error) {
      if (error.code === `ENOENT`) {
        return;
      } else {
        throw error;
      }
    }
    if (stat.isDirectory()) {
      if (recursive)
        for (const entry of this.readdirSync(p))
          this.removeSync(this.pathUtils.resolve(p, entry));
      this.rmdirSync(p);
    } else {
      this.unlinkSync(p);
    }
  }
  async mkdirpPromise(p, { chmod, utimes } = {}) {
    p = this.resolve(p);
    if (p === this.pathUtils.dirname(p))
      return void 0;
    const parts = p.split(this.pathUtils.sep);
    let createdDirectory;
    for (let u = 2; u <= parts.length; ++u) {
      const subPath = parts.slice(0, u).join(this.pathUtils.sep);
      if (!this.existsSync(subPath)) {
        try {
          await this.mkdirPromise(subPath);
        } catch (error) {
          if (error.code === `EEXIST`) {
            continue;
          } else {
            throw error;
          }
        }
        createdDirectory != null ? createdDirectory : createdDirectory = subPath;
        if (chmod != null)
          await this.chmodPromise(subPath, chmod);
        if (utimes != null) {
          await this.utimesPromise(subPath, utimes[0], utimes[1]);
        } else {
          const parentStat = await this.statPromise(this.pathUtils.dirname(subPath));
          await this.utimesPromise(subPath, parentStat.atime, parentStat.mtime);
        }
      }
    }
    return createdDirectory;
  }
  mkdirpSync(p, { chmod, utimes } = {}) {
    p = this.resolve(p);
    if (p === this.pathUtils.dirname(p))
      return void 0;
    const parts = p.split(this.pathUtils.sep);
    let createdDirectory;
    for (let u = 2; u <= parts.length; ++u) {
      const subPath = parts.slice(0, u).join(this.pathUtils.sep);
      if (!this.existsSync(subPath)) {
        try {
          this.mkdirSync(subPath);
        } catch (error) {
          if (error.code === `EEXIST`) {
            continue;
          } else {
            throw error;
          }
        }
        createdDirectory != null ? createdDirectory : createdDirectory = subPath;
        if (chmod != null)
          this.chmodSync(subPath, chmod);
        if (utimes != null) {
          this.utimesSync(subPath, utimes[0], utimes[1]);
        } else {
          const parentStat = this.statSync(this.pathUtils.dirname(subPath));
          this.utimesSync(subPath, parentStat.atime, parentStat.mtime);
        }
      }
    }
    return createdDirectory;
  }
  async copyPromise(destination, source, { baseFs = this, overwrite = true, stableSort = false, stableTime = false, linkStrategy = null } = {}) {
    return await copyPromise(this, destination, baseFs, source, { overwrite, stableSort, stableTime, linkStrategy });
  }
  copySync(destination, source, { baseFs = this, overwrite = true } = {}) {
    const stat = baseFs.lstatSync(source);
    const exists = this.existsSync(destination);
    if (stat.isDirectory()) {
      this.mkdirpSync(destination);
      const directoryListing = baseFs.readdirSync(source);
      for (const entry of directoryListing) {
        this.copySync(this.pathUtils.join(destination, entry), baseFs.pathUtils.join(source, entry), { baseFs, overwrite });
      }
    } else if (stat.isFile()) {
      if (!exists || overwrite) {
        if (exists)
          this.removeSync(destination);
        const content = baseFs.readFileSync(source);
        this.writeFileSync(destination, content);
      }
    } else if (stat.isSymbolicLink()) {
      if (!exists || overwrite) {
        if (exists)
          this.removeSync(destination);
        const target = baseFs.readlinkSync(source);
        this.symlinkSync(convertPath(this.pathUtils, target), destination);
      }
    } else {
      throw new Error(`Unsupported file type (file: ${source}, mode: 0o${stat.mode.toString(8).padStart(6, `0`)})`);
    }
    const mode = stat.mode & 511;
    this.chmodSync(destination, mode);
  }
  async changeFilePromise(p, content, opts = {}) {
    if (Buffer.isBuffer(content)) {
      return this.changeFileBufferPromise(p, content, opts);
    } else {
      return this.changeFileTextPromise(p, content, opts);
    }
  }
  async changeFileBufferPromise(p, content, { mode } = {}) {
    let current = Buffer.alloc(0);
    try {
      current = await this.readFilePromise(p);
    } catch (error) {
    }
    if (Buffer.compare(current, content) === 0)
      return;
    await this.writeFilePromise(p, content, { mode });
  }
  async changeFileTextPromise(p, content, { automaticNewlines, mode } = {}) {
    let current = ``;
    try {
      current = await this.readFilePromise(p, `utf8`);
    } catch (error) {
    }
    const normalizedContent = automaticNewlines ? normalizeLineEndings(current, content) : content;
    if (current === normalizedContent)
      return;
    await this.writeFilePromise(p, normalizedContent, { mode });
  }
  changeFileSync(p, content, opts = {}) {
    if (Buffer.isBuffer(content)) {
      return this.changeFileBufferSync(p, content, opts);
    } else {
      return this.changeFileTextSync(p, content, opts);
    }
  }
  changeFileBufferSync(p, content, { mode } = {}) {
    let current = Buffer.alloc(0);
    try {
      current = this.readFileSync(p);
    } catch (error) {
    }
    if (Buffer.compare(current, content) === 0)
      return;
    this.writeFileSync(p, content, { mode });
  }
  changeFileTextSync(p, content, { automaticNewlines = false, mode } = {}) {
    let current = ``;
    try {
      current = this.readFileSync(p, `utf8`);
    } catch (error) {
    }
    const normalizedContent = automaticNewlines ? normalizeLineEndings(current, content) : content;
    if (current === normalizedContent)
      return;
    this.writeFileSync(p, normalizedContent, { mode });
  }
  async movePromise(fromP, toP) {
    try {
      await this.renamePromise(fromP, toP);
    } catch (error) {
      if (error.code === `EXDEV`) {
        await this.copyPromise(toP, fromP);
        await this.removePromise(fromP);
      } else {
        throw error;
      }
    }
  }
  moveSync(fromP, toP) {
    try {
      this.renameSync(fromP, toP);
    } catch (error) {
      if (error.code === `EXDEV`) {
        this.copySync(toP, fromP);
        this.removeSync(fromP);
      } else {
        throw error;
      }
    }
  }
  async lockPromise(affectedPath, callback) {
    const lockPath = `${affectedPath}.flock`;
    const interval = 1e3 / 60;
    const startTime = Date.now();
    let fd = null;
    const isAlive = async () => {
      let pid;
      try {
        [pid] = await this.readJsonPromise(lockPath);
      } catch (error) {
        return Date.now() - startTime < 500;
      }
      try {
        process.kill(pid, 0);
        return true;
      } catch (error) {
        return false;
      }
    };
    while (fd === null) {
      try {
        fd = await this.openPromise(lockPath, `wx`);
      } catch (error) {
        if (error.code === `EEXIST`) {
          if (!await isAlive()) {
            try {
              await this.unlinkPromise(lockPath);
              continue;
            } catch (error2) {
            }
          }
          if (Date.now() - startTime < 60 * 1e3) {
            await new Promise((resolve) => setTimeout(resolve, interval));
          } else {
            throw new Error(`Couldn't acquire a lock in a reasonable time (via ${lockPath})`);
          }
        } else {
          throw error;
        }
      }
    }
    await this.writePromise(fd, JSON.stringify([process.pid]));
    try {
      return await callback();
    } finally {
      try {
        await this.closePromise(fd);
        await this.unlinkPromise(lockPath);
      } catch (error) {
      }
    }
  }
  async readJsonPromise(p) {
    const content = await this.readFilePromise(p, `utf8`);
    try {
      return JSON.parse(content);
    } catch (error) {
      error.message += ` (in ${p})`;
      throw error;
    }
  }
  readJsonSync(p) {
    const content = this.readFileSync(p, `utf8`);
    try {
      return JSON.parse(content);
    } catch (error) {
      error.message += ` (in ${p})`;
      throw error;
    }
  }
  async writeJsonPromise(p, data) {
    return await this.writeFilePromise(p, `${JSON.stringify(data, null, 2)}
`);
  }
  writeJsonSync(p, data) {
    return this.writeFileSync(p, `${JSON.stringify(data, null, 2)}
`);
  }
  async preserveTimePromise(p, cb) {
    const stat = await this.lstatPromise(p);
    const result = await cb();
    if (typeof result !== `undefined`)
      p = result;
    if (this.lutimesPromise) {
      await this.lutimesPromise(p, stat.atime, stat.mtime);
    } else if (!stat.isSymbolicLink()) {
      await this.utimesPromise(p, stat.atime, stat.mtime);
    }
  }
  async preserveTimeSync(p, cb) {
    const stat = this.lstatSync(p);
    const result = cb();
    if (typeof result !== `undefined`)
      p = result;
    if (this.lutimesSync) {
      this.lutimesSync(p, stat.atime, stat.mtime);
    } else if (!stat.isSymbolicLink()) {
      this.utimesSync(p, stat.atime, stat.mtime);
    }
  }
}
class BasePortableFakeFS extends FakeFS {
  constructor() {
    super(ppath);
  }
}
function getEndOfLine(content) {
  const matches = content.match(/\r?\n/g);
  if (matches === null)
    return EOL;
  const crlf = matches.filter((nl) => nl === `\r
`).length;
  const lf = matches.length - crlf;
  return crlf > lf ? `\r
` : `
`;
}
function normalizeLineEndings(originalContent, newContent) {
  return newContent.replace(/\r?\n/g, getEndOfLine(originalContent));
}

function makeError(code, message) {
  return Object.assign(new Error(`${code}: ${message}`), { code });
}
function ENOSYS(message, reason) {
  return makeError(`ENOSYS`, `${message}, ${reason}`);
}

class NodeFS extends BasePortableFakeFS {
  constructor(realFs = fs) {
    super();
    this.realFs = realFs;
    if (typeof this.realFs.lutimes !== `undefined`) {
      this.lutimesPromise = this.lutimesPromiseImpl;
      this.lutimesSync = this.lutimesSyncImpl;
    }
  }
  getExtractHint() {
    return false;
  }
  getRealPath() {
    return PortablePath.root;
  }
  resolve(p) {
    return ppath.resolve(p);
  }
  async openPromise(p, flags, mode) {
    return await new Promise((resolve, reject) => {
      this.realFs.open(npath.fromPortablePath(p), flags, mode, this.makeCallback(resolve, reject));
    });
  }
  openSync(p, flags, mode) {
    return this.realFs.openSync(npath.fromPortablePath(p), flags, mode);
  }
  async opendirPromise(p, opts) {
    return await new Promise((resolve, reject) => {
      if (typeof opts !== `undefined`) {
        this.realFs.opendir(npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
      } else {
        this.realFs.opendir(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
      }
    }).then((dir) => {
      return Object.defineProperty(dir, `path`, { value: p, configurable: true, writable: true });
    });
  }
  opendirSync(p, opts) {
    const dir = typeof opts !== `undefined` ? this.realFs.opendirSync(npath.fromPortablePath(p), opts) : this.realFs.opendirSync(npath.fromPortablePath(p));
    return Object.defineProperty(dir, `path`, { value: p, configurable: true, writable: true });
  }
  async readPromise(fd, buffer, offset = 0, length = 0, position = -1) {
    return await new Promise((resolve, reject) => {
      this.realFs.read(fd, buffer, offset, length, position, (error, bytesRead) => {
        if (error) {
          reject(error);
        } else {
          resolve(bytesRead);
        }
      });
    });
  }
  readSync(fd, buffer, offset, length, position) {
    return this.realFs.readSync(fd, buffer, offset, length, position);
  }
  async writePromise(fd, buffer, offset, length, position) {
    return await new Promise((resolve, reject) => {
      if (typeof buffer === `string`) {
        return this.realFs.write(fd, buffer, offset, this.makeCallback(resolve, reject));
      } else {
        return this.realFs.write(fd, buffer, offset, length, position, this.makeCallback(resolve, reject));
      }
    });
  }
  writeSync(fd, buffer, offset, length, position) {
    if (typeof buffer === `string`) {
      return this.realFs.writeSync(fd, buffer, offset);
    } else {
      return this.realFs.writeSync(fd, buffer, offset, length, position);
    }
  }
  async closePromise(fd) {
    await new Promise((resolve, reject) => {
      this.realFs.close(fd, this.makeCallback(resolve, reject));
    });
  }
  closeSync(fd) {
    this.realFs.closeSync(fd);
  }
  createReadStream(p, opts) {
    const realPath = p !== null ? npath.fromPortablePath(p) : p;
    return this.realFs.createReadStream(realPath, opts);
  }
  createWriteStream(p, opts) {
    const realPath = p !== null ? npath.fromPortablePath(p) : p;
    return this.realFs.createWriteStream(realPath, opts);
  }
  async realpathPromise(p) {
    return await new Promise((resolve, reject) => {
      this.realFs.realpath(npath.fromPortablePath(p), {}, this.makeCallback(resolve, reject));
    }).then((path) => {
      return npath.toPortablePath(path);
    });
  }
  realpathSync(p) {
    return npath.toPortablePath(this.realFs.realpathSync(npath.fromPortablePath(p), {}));
  }
  async existsPromise(p) {
    return await new Promise((resolve) => {
      this.realFs.exists(npath.fromPortablePath(p), resolve);
    });
  }
  accessSync(p, mode) {
    return this.realFs.accessSync(npath.fromPortablePath(p), mode);
  }
  async accessPromise(p, mode) {
    return await new Promise((resolve, reject) => {
      this.realFs.access(npath.fromPortablePath(p), mode, this.makeCallback(resolve, reject));
    });
  }
  existsSync(p) {
    return this.realFs.existsSync(npath.fromPortablePath(p));
  }
  async statPromise(p, opts) {
    return await new Promise((resolve, reject) => {
      if (opts) {
        this.realFs.stat(npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
      } else {
        this.realFs.stat(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
      }
    });
  }
  statSync(p, opts) {
    if (opts) {
      return this.realFs.statSync(npath.fromPortablePath(p), opts);
    } else {
      return this.realFs.statSync(npath.fromPortablePath(p));
    }
  }
  async fstatPromise(fd, opts) {
    return await new Promise((resolve, reject) => {
      if (opts) {
        this.realFs.fstat(fd, opts, this.makeCallback(resolve, reject));
      } else {
        this.realFs.fstat(fd, this.makeCallback(resolve, reject));
      }
    });
  }
  fstatSync(fd, opts) {
    if (opts) {
      return this.realFs.fstatSync(fd, opts);
    } else {
      return this.realFs.fstatSync(fd);
    }
  }
  async lstatPromise(p, opts) {
    return await new Promise((resolve, reject) => {
      if (opts) {
        this.realFs.lstat(npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
      } else {
        this.realFs.lstat(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
      }
    });
  }
  lstatSync(p, opts) {
    if (opts) {
      return this.realFs.lstatSync(npath.fromPortablePath(p), opts);
    } else {
      return this.realFs.lstatSync(npath.fromPortablePath(p));
    }
  }
  async fchmodPromise(fd, mask) {
    return await new Promise((resolve, reject) => {
      this.realFs.fchmod(fd, mask, this.makeCallback(resolve, reject));
    });
  }
  fchmodSync(fd, mask) {
    return this.realFs.fchmodSync(fd, mask);
  }
  async chmodPromise(p, mask) {
    return await new Promise((resolve, reject) => {
      this.realFs.chmod(npath.fromPortablePath(p), mask, this.makeCallback(resolve, reject));
    });
  }
  chmodSync(p, mask) {
    return this.realFs.chmodSync(npath.fromPortablePath(p), mask);
  }
  async fchownPromise(fd, uid, gid) {
    return await new Promise((resolve, reject) => {
      this.realFs.fchown(fd, uid, gid, this.makeCallback(resolve, reject));
    });
  }
  fchownSync(fd, uid, gid) {
    return this.realFs.fchownSync(fd, uid, gid);
  }
  async chownPromise(p, uid, gid) {
    return await new Promise((resolve, reject) => {
      this.realFs.chown(npath.fromPortablePath(p), uid, gid, this.makeCallback(resolve, reject));
    });
  }
  chownSync(p, uid, gid) {
    return this.realFs.chownSync(npath.fromPortablePath(p), uid, gid);
  }
  async renamePromise(oldP, newP) {
    return await new Promise((resolve, reject) => {
      this.realFs.rename(npath.fromPortablePath(oldP), npath.fromPortablePath(newP), this.makeCallback(resolve, reject));
    });
  }
  renameSync(oldP, newP) {
    return this.realFs.renameSync(npath.fromPortablePath(oldP), npath.fromPortablePath(newP));
  }
  async copyFilePromise(sourceP, destP, flags = 0) {
    return await new Promise((resolve, reject) => {
      this.realFs.copyFile(npath.fromPortablePath(sourceP), npath.fromPortablePath(destP), flags, this.makeCallback(resolve, reject));
    });
  }
  copyFileSync(sourceP, destP, flags = 0) {
    return this.realFs.copyFileSync(npath.fromPortablePath(sourceP), npath.fromPortablePath(destP), flags);
  }
  async appendFilePromise(p, content, opts) {
    return await new Promise((resolve, reject) => {
      const fsNativePath = typeof p === `string` ? npath.fromPortablePath(p) : p;
      if (opts) {
        this.realFs.appendFile(fsNativePath, content, opts, this.makeCallback(resolve, reject));
      } else {
        this.realFs.appendFile(fsNativePath, content, this.makeCallback(resolve, reject));
      }
    });
  }
  appendFileSync(p, content, opts) {
    const fsNativePath = typeof p === `string` ? npath.fromPortablePath(p) : p;
    if (opts) {
      this.realFs.appendFileSync(fsNativePath, content, opts);
    } else {
      this.realFs.appendFileSync(fsNativePath, content);
    }
  }
  async writeFilePromise(p, content, opts) {
    return await new Promise((resolve, reject) => {
      const fsNativePath = typeof p === `string` ? npath.fromPortablePath(p) : p;
      if (opts) {
        this.realFs.writeFile(fsNativePath, content, opts, this.makeCallback(resolve, reject));
      } else {
        this.realFs.writeFile(fsNativePath, content, this.makeCallback(resolve, reject));
      }
    });
  }
  writeFileSync(p, content, opts) {
    const fsNativePath = typeof p === `string` ? npath.fromPortablePath(p) : p;
    if (opts) {
      this.realFs.writeFileSync(fsNativePath, content, opts);
    } else {
      this.realFs.writeFileSync(fsNativePath, content);
    }
  }
  async unlinkPromise(p) {
    return await new Promise((resolve, reject) => {
      this.realFs.unlink(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
    });
  }
  unlinkSync(p) {
    return this.realFs.unlinkSync(npath.fromPortablePath(p));
  }
  async utimesPromise(p, atime, mtime) {
    return await new Promise((resolve, reject) => {
      this.realFs.utimes(npath.fromPortablePath(p), atime, mtime, this.makeCallback(resolve, reject));
    });
  }
  utimesSync(p, atime, mtime) {
    this.realFs.utimesSync(npath.fromPortablePath(p), atime, mtime);
  }
  async lutimesPromiseImpl(p, atime, mtime) {
    const lutimes = this.realFs.lutimes;
    if (typeof lutimes === `undefined`)
      throw ENOSYS(`unavailable Node binding`, `lutimes '${p}'`);
    return await new Promise((resolve, reject) => {
      lutimes.call(this.realFs, npath.fromPortablePath(p), atime, mtime, this.makeCallback(resolve, reject));
    });
  }
  lutimesSyncImpl(p, atime, mtime) {
    const lutimesSync = this.realFs.lutimesSync;
    if (typeof lutimesSync === `undefined`)
      throw ENOSYS(`unavailable Node binding`, `lutimes '${p}'`);
    lutimesSync.call(this.realFs, npath.fromPortablePath(p), atime, mtime);
  }
  async mkdirPromise(p, opts) {
    return await new Promise((resolve, reject) => {
      this.realFs.mkdir(npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
    });
  }
  mkdirSync(p, opts) {
    return this.realFs.mkdirSync(npath.fromPortablePath(p), opts);
  }
  async rmdirPromise(p, opts) {
    return await new Promise((resolve, reject) => {
      if (opts) {
        this.realFs.rmdir(npath.fromPortablePath(p), opts, this.makeCallback(resolve, reject));
      } else {
        this.realFs.rmdir(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
      }
    });
  }
  rmdirSync(p, opts) {
    return this.realFs.rmdirSync(npath.fromPortablePath(p), opts);
  }
  async linkPromise(existingP, newP) {
    return await new Promise((resolve, reject) => {
      this.realFs.link(npath.fromPortablePath(existingP), npath.fromPortablePath(newP), this.makeCallback(resolve, reject));
    });
  }
  linkSync(existingP, newP) {
    return this.realFs.linkSync(npath.fromPortablePath(existingP), npath.fromPortablePath(newP));
  }
  async symlinkPromise(target, p, type) {
    return await new Promise((resolve, reject) => {
      this.realFs.symlink(npath.fromPortablePath(target.replace(/\/+$/, ``)), npath.fromPortablePath(p), type, this.makeCallback(resolve, reject));
    });
  }
  symlinkSync(target, p, type) {
    return this.realFs.symlinkSync(npath.fromPortablePath(target.replace(/\/+$/, ``)), npath.fromPortablePath(p), type);
  }
  async readFilePromise(p, encoding) {
    return await new Promise((resolve, reject) => {
      const fsNativePath = typeof p === `string` ? npath.fromPortablePath(p) : p;
      this.realFs.readFile(fsNativePath, encoding, this.makeCallback(resolve, reject));
    });
  }
  readFileSync(p, encoding) {
    const fsNativePath = typeof p === `string` ? npath.fromPortablePath(p) : p;
    return this.realFs.readFileSync(fsNativePath, encoding);
  }
  async readdirPromise(p, opts) {
    return await new Promise((resolve, reject) => {
      if (opts == null ? void 0 : opts.withFileTypes) {
        this.realFs.readdir(npath.fromPortablePath(p), { withFileTypes: true }, this.makeCallback(resolve, reject));
      } else {
        this.realFs.readdir(npath.fromPortablePath(p), this.makeCallback((value) => resolve(value), reject));
      }
    });
  }
  readdirSync(p, opts) {
    if (opts == null ? void 0 : opts.withFileTypes) {
      return this.realFs.readdirSync(npath.fromPortablePath(p), { withFileTypes: true });
    } else {
      return this.realFs.readdirSync(npath.fromPortablePath(p));
    }
  }
  async readlinkPromise(p) {
    return await new Promise((resolve, reject) => {
      this.realFs.readlink(npath.fromPortablePath(p), this.makeCallback(resolve, reject));
    }).then((path) => {
      return npath.toPortablePath(path);
    });
  }
  readlinkSync(p) {
    return npath.toPortablePath(this.realFs.readlinkSync(npath.fromPortablePath(p)));
  }
  async truncatePromise(p, len) {
    return await new Promise((resolve, reject) => {
      this.realFs.truncate(npath.fromPortablePath(p), len, this.makeCallback(resolve, reject));
    });
  }
  truncateSync(p, len) {
    return this.realFs.truncateSync(npath.fromPortablePath(p), len);
  }
  async ftruncatePromise(fd, len) {
    return await new Promise((resolve, reject) => {
      this.realFs.ftruncate(fd, len, this.makeCallback(resolve, reject));
    });
  }
  ftruncateSync(fd, len) {
    return this.realFs.ftruncateSync(fd, len);
  }
  watch(p, a, b) {
    return this.realFs.watch(
      npath.fromPortablePath(p),
      a,
      b
    );
  }
  watchFile(p, a, b) {
    return this.realFs.watchFile(
      npath.fromPortablePath(p),
      a,
      b
    );
  }
  unwatchFile(p, cb) {
    return this.realFs.unwatchFile(npath.fromPortablePath(p), cb);
  }
  makeCallback(resolve, reject) {
    return (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    };
  }
}

class ProxiedFS extends FakeFS {
  getExtractHint(hints) {
    return this.baseFs.getExtractHint(hints);
  }
  resolve(path) {
    return this.mapFromBase(this.baseFs.resolve(this.mapToBase(path)));
  }
  getRealPath() {
    return this.mapFromBase(this.baseFs.getRealPath());
  }
  async openPromise(p, flags, mode) {
    return this.baseFs.openPromise(this.mapToBase(p), flags, mode);
  }
  openSync(p, flags, mode) {
    return this.baseFs.openSync(this.mapToBase(p), flags, mode);
  }
  async opendirPromise(p, opts) {
    return Object.assign(await this.baseFs.opendirPromise(this.mapToBase(p), opts), { path: p });
  }
  opendirSync(p, opts) {
    return Object.assign(this.baseFs.opendirSync(this.mapToBase(p), opts), { path: p });
  }
  async readPromise(fd, buffer, offset, length, position) {
    return await this.baseFs.readPromise(fd, buffer, offset, length, position);
  }
  readSync(fd, buffer, offset, length, position) {
    return this.baseFs.readSync(fd, buffer, offset, length, position);
  }
  async writePromise(fd, buffer, offset, length, position) {
    if (typeof buffer === `string`) {
      return await this.baseFs.writePromise(fd, buffer, offset);
    } else {
      return await this.baseFs.writePromise(fd, buffer, offset, length, position);
    }
  }
  writeSync(fd, buffer, offset, length, position) {
    if (typeof buffer === `string`) {
      return this.baseFs.writeSync(fd, buffer, offset);
    } else {
      return this.baseFs.writeSync(fd, buffer, offset, length, position);
    }
  }
  async closePromise(fd) {
    return this.baseFs.closePromise(fd);
  }
  closeSync(fd) {
    this.baseFs.closeSync(fd);
  }
  createReadStream(p, opts) {
    return this.baseFs.createReadStream(p !== null ? this.mapToBase(p) : p, opts);
  }
  createWriteStream(p, opts) {
    return this.baseFs.createWriteStream(p !== null ? this.mapToBase(p) : p, opts);
  }
  async realpathPromise(p) {
    return this.mapFromBase(await this.baseFs.realpathPromise(this.mapToBase(p)));
  }
  realpathSync(p) {
    return this.mapFromBase(this.baseFs.realpathSync(this.mapToBase(p)));
  }
  async existsPromise(p) {
    return this.baseFs.existsPromise(this.mapToBase(p));
  }
  existsSync(p) {
    return this.baseFs.existsSync(this.mapToBase(p));
  }
  accessSync(p, mode) {
    return this.baseFs.accessSync(this.mapToBase(p), mode);
  }
  async accessPromise(p, mode) {
    return this.baseFs.accessPromise(this.mapToBase(p), mode);
  }
  async statPromise(p, opts) {
    return this.baseFs.statPromise(this.mapToBase(p), opts);
  }
  statSync(p, opts) {
    return this.baseFs.statSync(this.mapToBase(p), opts);
  }
  async fstatPromise(fd, opts) {
    return this.baseFs.fstatPromise(fd, opts);
  }
  fstatSync(fd, opts) {
    return this.baseFs.fstatSync(fd, opts);
  }
  lstatPromise(p, opts) {
    return this.baseFs.lstatPromise(this.mapToBase(p), opts);
  }
  lstatSync(p, opts) {
    return this.baseFs.lstatSync(this.mapToBase(p), opts);
  }
  async fchmodPromise(fd, mask) {
    return this.baseFs.fchmodPromise(fd, mask);
  }
  fchmodSync(fd, mask) {
    return this.baseFs.fchmodSync(fd, mask);
  }
  async chmodPromise(p, mask) {
    return this.baseFs.chmodPromise(this.mapToBase(p), mask);
  }
  chmodSync(p, mask) {
    return this.baseFs.chmodSync(this.mapToBase(p), mask);
  }
  async fchownPromise(fd, uid, gid) {
    return this.baseFs.fchownPromise(fd, uid, gid);
  }
  fchownSync(fd, uid, gid) {
    return this.baseFs.fchownSync(fd, uid, gid);
  }
  async chownPromise(p, uid, gid) {
    return this.baseFs.chownPromise(this.mapToBase(p), uid, gid);
  }
  chownSync(p, uid, gid) {
    return this.baseFs.chownSync(this.mapToBase(p), uid, gid);
  }
  async renamePromise(oldP, newP) {
    return this.baseFs.renamePromise(this.mapToBase(oldP), this.mapToBase(newP));
  }
  renameSync(oldP, newP) {
    return this.baseFs.renameSync(this.mapToBase(oldP), this.mapToBase(newP));
  }
  async copyFilePromise(sourceP, destP, flags = 0) {
    return this.baseFs.copyFilePromise(this.mapToBase(sourceP), this.mapToBase(destP), flags);
  }
  copyFileSync(sourceP, destP, flags = 0) {
    return this.baseFs.copyFileSync(this.mapToBase(sourceP), this.mapToBase(destP), flags);
  }
  async appendFilePromise(p, content, opts) {
    return this.baseFs.appendFilePromise(this.fsMapToBase(p), content, opts);
  }
  appendFileSync(p, content, opts) {
    return this.baseFs.appendFileSync(this.fsMapToBase(p), content, opts);
  }
  async writeFilePromise(p, content, opts) {
    return this.baseFs.writeFilePromise(this.fsMapToBase(p), content, opts);
  }
  writeFileSync(p, content, opts) {
    return this.baseFs.writeFileSync(this.fsMapToBase(p), content, opts);
  }
  async unlinkPromise(p) {
    return this.baseFs.unlinkPromise(this.mapToBase(p));
  }
  unlinkSync(p) {
    return this.baseFs.unlinkSync(this.mapToBase(p));
  }
  async utimesPromise(p, atime, mtime) {
    return this.baseFs.utimesPromise(this.mapToBase(p), atime, mtime);
  }
  utimesSync(p, atime, mtime) {
    return this.baseFs.utimesSync(this.mapToBase(p), atime, mtime);
  }
  async mkdirPromise(p, opts) {
    return this.baseFs.mkdirPromise(this.mapToBase(p), opts);
  }
  mkdirSync(p, opts) {
    return this.baseFs.mkdirSync(this.mapToBase(p), opts);
  }
  async rmdirPromise(p, opts) {
    return this.baseFs.rmdirPromise(this.mapToBase(p), opts);
  }
  rmdirSync(p, opts) {
    return this.baseFs.rmdirSync(this.mapToBase(p), opts);
  }
  async linkPromise(existingP, newP) {
    return this.baseFs.linkPromise(this.mapToBase(existingP), this.mapToBase(newP));
  }
  linkSync(existingP, newP) {
    return this.baseFs.linkSync(this.mapToBase(existingP), this.mapToBase(newP));
  }
  async symlinkPromise(target, p, type) {
    const mappedP = this.mapToBase(p);
    if (this.pathUtils.isAbsolute(target))
      return this.baseFs.symlinkPromise(this.mapToBase(target), mappedP, type);
    const mappedAbsoluteTarget = this.mapToBase(this.pathUtils.join(this.pathUtils.dirname(p), target));
    const mappedTarget = this.baseFs.pathUtils.relative(this.baseFs.pathUtils.dirname(mappedP), mappedAbsoluteTarget);
    return this.baseFs.symlinkPromise(mappedTarget, mappedP, type);
  }
  symlinkSync(target, p, type) {
    const mappedP = this.mapToBase(p);
    if (this.pathUtils.isAbsolute(target))
      return this.baseFs.symlinkSync(this.mapToBase(target), mappedP, type);
    const mappedAbsoluteTarget = this.mapToBase(this.pathUtils.join(this.pathUtils.dirname(p), target));
    const mappedTarget = this.baseFs.pathUtils.relative(this.baseFs.pathUtils.dirname(mappedP), mappedAbsoluteTarget);
    return this.baseFs.symlinkSync(mappedTarget, mappedP, type);
  }
  async readFilePromise(p, encoding) {
    if (encoding === `utf8`) {
      return this.baseFs.readFilePromise(this.fsMapToBase(p), encoding);
    } else {
      return this.baseFs.readFilePromise(this.fsMapToBase(p), encoding);
    }
  }
  readFileSync(p, encoding) {
    if (encoding === `utf8`) {
      return this.baseFs.readFileSync(this.fsMapToBase(p), encoding);
    } else {
      return this.baseFs.readFileSync(this.fsMapToBase(p), encoding);
    }
  }
  async readdirPromise(p, opts) {
    return this.baseFs.readdirPromise(this.mapToBase(p), opts);
  }
  readdirSync(p, opts) {
    return this.baseFs.readdirSync(this.mapToBase(p), opts);
  }
  async readlinkPromise(p) {
    return this.mapFromBase(await this.baseFs.readlinkPromise(this.mapToBase(p)));
  }
  readlinkSync(p) {
    return this.mapFromBase(this.baseFs.readlinkSync(this.mapToBase(p)));
  }
  async truncatePromise(p, len) {
    return this.baseFs.truncatePromise(this.mapToBase(p), len);
  }
  truncateSync(p, len) {
    return this.baseFs.truncateSync(this.mapToBase(p), len);
  }
  async ftruncatePromise(fd, len) {
    return this.baseFs.ftruncatePromise(fd, len);
  }
  ftruncateSync(fd, len) {
    return this.baseFs.ftruncateSync(fd, len);
  }
  watch(p, a, b) {
    return this.baseFs.watch(
      this.mapToBase(p),
      a,
      b
    );
  }
  watchFile(p, a, b) {
    return this.baseFs.watchFile(
      this.mapToBase(p),
      a,
      b
    );
  }
  unwatchFile(p, cb) {
    return this.baseFs.unwatchFile(this.mapToBase(p), cb);
  }
  fsMapToBase(p) {
    if (typeof p === `number`) {
      return p;
    } else {
      return this.mapToBase(p);
    }
  }
}

const NUMBER_REGEXP = /^[0-9]+$/;
const VIRTUAL_REGEXP = /^(\/(?:[^/]+\/)*?(?:\$\$virtual|__virtual__))((?:\/((?:[^/]+-)?[a-f0-9]+)(?:\/([^/]+))?)?((?:\/.*)?))$/;
const VALID_COMPONENT = /^([^/]+-)?[a-f0-9]+$/;
class VirtualFS extends ProxiedFS {
  constructor({ baseFs = new NodeFS() } = {}) {
    super(ppath);
    this.baseFs = baseFs;
  }
  static makeVirtualPath(base, component, to) {
    if (ppath.basename(base) !== `__virtual__`)
      throw new Error(`Assertion failed: Virtual folders must be named "__virtual__"`);
    if (!ppath.basename(component).match(VALID_COMPONENT))
      throw new Error(`Assertion failed: Virtual components must be ended by an hexadecimal hash`);
    const target = ppath.relative(ppath.dirname(base), to);
    const segments = target.split(`/`);
    let depth = 0;
    while (depth < segments.length && segments[depth] === `..`)
      depth += 1;
    const finalSegments = segments.slice(depth);
    const fullVirtualPath = ppath.join(base, component, String(depth), ...finalSegments);
    return fullVirtualPath;
  }
  static resolveVirtual(p) {
    const match = p.match(VIRTUAL_REGEXP);
    if (!match || !match[3] && match[5])
      return p;
    const target = ppath.dirname(match[1]);
    if (!match[3] || !match[4])
      return target;
    const isnum = NUMBER_REGEXP.test(match[4]);
    if (!isnum)
      return p;
    const depth = Number(match[4]);
    const backstep = `../`.repeat(depth);
    const subpath = match[5] || `.`;
    return VirtualFS.resolveVirtual(ppath.join(target, backstep, subpath));
  }
  getExtractHint(hints) {
    return this.baseFs.getExtractHint(hints);
  }
  getRealPath() {
    return this.baseFs.getRealPath();
  }
  realpathSync(p) {
    const match = p.match(VIRTUAL_REGEXP);
    if (!match)
      return this.baseFs.realpathSync(p);
    if (!match[5])
      return p;
    const realpath = this.baseFs.realpathSync(this.mapToBase(p));
    return VirtualFS.makeVirtualPath(match[1], match[3], realpath);
  }
  async realpathPromise(p) {
    const match = p.match(VIRTUAL_REGEXP);
    if (!match)
      return await this.baseFs.realpathPromise(p);
    if (!match[5])
      return p;
    const realpath = await this.baseFs.realpathPromise(this.mapToBase(p));
    return VirtualFS.makeVirtualPath(match[1], match[3], realpath);
  }
  mapToBase(p) {
    if (p === ``)
      return p;
    if (this.pathUtils.isAbsolute(p))
      return VirtualFS.resolveVirtual(p);
    const resolvedRoot = VirtualFS.resolveVirtual(this.baseFs.resolve(PortablePath.dot));
    const resolvedP = VirtualFS.resolveVirtual(this.baseFs.resolve(p));
    return ppath.relative(resolvedRoot, resolvedP) || PortablePath.dot;
  }
  mapFromBase(p) {
    return p;
  }
}

async function load$2(urlString, context, nextLoad) {
  var _a;
  const url = tryParseURL(urlString);
  if ((url == null ? void 0 : url.protocol) !== `file:`)
    return nextLoad(urlString, context, nextLoad);
  const filePath = fileURLToPath(url);
  const format = getFileFormat$1(filePath);
  if (!format)
    return nextLoad(urlString, context, nextLoad);
  if (HAS_JSON_IMPORT_ASSERTION_REQUIREMENT && format === `json` && ((_a = context.importAssertions) == null ? void 0 : _a.type) !== `json`) {
    const err = new TypeError(`[ERR_IMPORT_ASSERTION_TYPE_MISSING]: Module "${urlString}" needs an import assertion of type "json"`);
    err.code = `ERR_IMPORT_ASSERTION_TYPE_MISSING`;
    throw err;
  }
  if (process.env.WATCH_REPORT_DEPENDENCIES && process.send) {
    const pathToSend = pathToFileURL(
      npath.fromPortablePath(
        VirtualFS.resolveVirtual(npath.toPortablePath(filePath))
      )
    ).href;
    process.send({
      "watch:import": WATCH_MODE_MESSAGE_USES_ARRAYS ? [pathToSend] : pathToSend
    });
  }
  return {
    format,
    source: await fs.promises.readFile(filePath, `utf8`),
    shortCircuit: true
  };
}

async function load$1(urlString, context, nextLoad) {
  return await load$2(urlString, context, async (urlString2, context2) => {
    const url = tryParseURL(urlString2);
    if ((url == null ? void 0 : url.protocol) !== `file:`)
      return nextLoad(urlString2, context2, nextLoad);
    const filePath = fileURLToPath(url);
    const format = getFileFormat(filePath);
    if (!format)
      return nextLoad(urlString2, context2, nextLoad);
    if (process.env.WATCH_REPORT_DEPENDENCIES && process.send) {
      const pathToSend = pathToFileURL(
        lib.npath.fromPortablePath(
          lib.VirtualFS.resolveVirtual(lib.npath.toPortablePath(filePath))
        )
      ).href;
      process.send({
        // eslint-disable-next-line @typescript-eslint/naming-convention
        "watch:import": WATCH_MODE_MESSAGE_USES_ARRAYS ? [pathToSend] : pathToSend
      });
    }
    const source = await fs.promises.readFile(filePath, `utf8`);
    return {
      format,
      source: transformSource(source, format, filePath.includes('.tsx') ? 'tsx' : 'ts'),
      shortCircuit: true
    };
  });
}

const ArrayIsArray = Array.isArray;
const JSONStringify = JSON.stringify;
const ObjectGetOwnPropertyNames = Object.getOwnPropertyNames;
const ObjectPrototypeHasOwnProperty = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
const RegExpPrototypeExec = (obj, string) => RegExp.prototype.exec.call(obj, string);
const RegExpPrototypeSymbolReplace = (obj, ...rest) => RegExp.prototype[Symbol.replace].apply(obj, rest);
const StringPrototypeEndsWith = (str, ...rest) => String.prototype.endsWith.apply(str, rest);
const StringPrototypeIncludes = (str, ...rest) => String.prototype.includes.apply(str, rest);
const StringPrototypeLastIndexOf = (str, ...rest) => String.prototype.lastIndexOf.apply(str, rest);
const StringPrototypeIndexOf = (str, ...rest) => String.prototype.indexOf.apply(str, rest);
const StringPrototypeReplace = (str, ...rest) => String.prototype.replace.apply(str, rest);
const StringPrototypeSlice = (str, ...rest) => String.prototype.slice.apply(str, rest);
const StringPrototypeStartsWith = (str, ...rest) => String.prototype.startsWith.apply(str, rest);
const SafeMap = Map;
const JSONParse = JSON.parse;

function createErrorType(code, messageCreator, errorType) {
  return class extends errorType {
    constructor(...args) {
      super(messageCreator(...args));
      this.code = code;
      this.name = `${errorType.name} [${code}]`;
    }
  };
}
const ERR_PACKAGE_IMPORT_NOT_DEFINED = createErrorType(
  `ERR_PACKAGE_IMPORT_NOT_DEFINED`,
  (specifier, packagePath, base) => {
    return `Package import specifier "${specifier}" is not defined${packagePath ? ` in package ${packagePath}package.json` : ``} imported from ${base}`;
  },
  TypeError
);
const ERR_INVALID_MODULE_SPECIFIER = createErrorType(
  `ERR_INVALID_MODULE_SPECIFIER`,
  (request, reason, base = void 0) => {
    return `Invalid module "${request}" ${reason}${base ? ` imported from ${base}` : ``}`;
  },
  TypeError
);
const ERR_INVALID_PACKAGE_TARGET = createErrorType(
  `ERR_INVALID_PACKAGE_TARGET`,
  (pkgPath, key, target, isImport = false, base = void 0) => {
    const relError = typeof target === `string` && !isImport && target.length && !StringPrototypeStartsWith(target, `./`);
    if (key === `.`) {
      assert(isImport === false);
      return `Invalid "exports" main target ${JSONStringify(target)} defined in the package config ${pkgPath}package.json${base ? ` imported from ${base}` : ``}${relError ? `; targets must start with "./"` : ``}`;
    }
    return `Invalid "${isImport ? `imports` : `exports`}" target ${JSONStringify(
      target
    )} defined for '${key}' in the package config ${pkgPath}package.json${base ? ` imported from ${base}` : ``}${relError ? `; targets must start with "./"` : ``}`;
  },
  Error
);
const ERR_INVALID_PACKAGE_CONFIG = createErrorType(
  `ERR_INVALID_PACKAGE_CONFIG`,
  (path, base, message) => {
    return `Invalid package config ${path}${base ? ` while importing ${base}` : ``}${message ? `. ${message}` : ``}`;
  },
  Error
);

function filterOwnProperties(source, keys) {
  const filtered = /* @__PURE__ */ Object.create(null);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if (ObjectPrototypeHasOwnProperty(source, key)) {
      filtered[key] = source[key];
    }
  }
  return filtered;
}

const packageJSONCache = new SafeMap();
function getPackageConfig(path, specifier, base, readFileSyncFn) {
  const existing = packageJSONCache.get(path);
  if (existing !== void 0) {
    return existing;
  }
  const source = readFileSyncFn(path);
  if (source === void 0) {
    const packageConfig2 = {
      pjsonPath: path,
      exists: false,
      main: void 0,
      name: void 0,
      type: "none",
      exports: void 0,
      imports: void 0
    };
    packageJSONCache.set(path, packageConfig2);
    return packageConfig2;
  }
  let packageJSON;
  try {
    packageJSON = JSONParse(source);
  } catch (error) {
    throw new ERR_INVALID_PACKAGE_CONFIG(
      path,
      (base ? `"${specifier}" from ` : "") + fileURLToPath(base || specifier),
      error.message
    );
  }
  let { imports, main, name, type } = filterOwnProperties(packageJSON, [
    "imports",
    "main",
    "name",
    "type"
  ]);
  const exports = ObjectPrototypeHasOwnProperty(packageJSON, "exports") ? packageJSON.exports : void 0;
  if (typeof imports !== "object" || imports === null) {
    imports = void 0;
  }
  if (typeof main !== "string") {
    main = void 0;
  }
  if (typeof name !== "string") {
    name = void 0;
  }
  if (type !== "module" && type !== "commonjs") {
    type = "none";
  }
  const packageConfig = {
    pjsonPath: path,
    exists: true,
    main,
    name,
    type,
    exports,
    imports
  };
  packageJSONCache.set(path, packageConfig);
  return packageConfig;
}
function getPackageScopeConfig(resolved, readFileSyncFn) {
  let packageJSONUrl = new URL("./package.json", resolved);
  while (true) {
    const packageJSONPath2 = packageJSONUrl.pathname;
    if (StringPrototypeEndsWith(packageJSONPath2, "node_modules/package.json")) {
      break;
    }
    const packageConfig2 = getPackageConfig(
      fileURLToPath(packageJSONUrl),
      resolved,
      void 0,
      readFileSyncFn
    );
    if (packageConfig2.exists) {
      return packageConfig2;
    }
    const lastPackageJSONUrl = packageJSONUrl;
    packageJSONUrl = new URL("../package.json", packageJSONUrl);
    if (packageJSONUrl.pathname === lastPackageJSONUrl.pathname) {
      break;
    }
  }
  const packageJSONPath = fileURLToPath(packageJSONUrl);
  const packageConfig = {
    pjsonPath: packageJSONPath,
    exists: false,
    main: void 0,
    name: void 0,
    type: "none",
    exports: void 0,
    imports: void 0
  };
  packageJSONCache.set(packageJSONPath, packageConfig);
  return packageConfig;
}

/**
  @license
  Copyright Node.js contributors. All rights reserved.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to
  deal in the Software without restriction, including without limitation the
  rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
  sell copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
  FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
  IN THE SOFTWARE.
*/
function throwImportNotDefined(specifier, packageJSONUrl, base) {
  throw new ERR_PACKAGE_IMPORT_NOT_DEFINED(
    specifier,
    packageJSONUrl && fileURLToPath(new URL(".", packageJSONUrl)),
    fileURLToPath(base)
  );
}
function throwInvalidSubpath(subpath, packageJSONUrl, internal, base) {
  const reason = `request is not a valid subpath for the "${internal ? "imports" : "exports"}" resolution of ${fileURLToPath(packageJSONUrl)}`;
  throw new ERR_INVALID_MODULE_SPECIFIER(
    subpath,
    reason,
    base && fileURLToPath(base)
  );
}
function throwInvalidPackageTarget(subpath, target, packageJSONUrl, internal, base) {
  if (typeof target === "object" && target !== null) {
    target = JSONStringify(target, null, "");
  } else {
    target = `${target}`;
  }
  throw new ERR_INVALID_PACKAGE_TARGET(
    fileURLToPath(new URL(".", packageJSONUrl)),
    subpath,
    target,
    internal,
    base && fileURLToPath(base)
  );
}
const invalidSegmentRegEx = /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))(\\|\/|$)/i;
const patternRegEx = /\*/g;
function resolvePackageTargetString(target, subpath, match, packageJSONUrl, base, pattern, internal, conditions) {
  if (subpath !== "" && !pattern && target[target.length - 1] !== "/")
    throwInvalidPackageTarget(match, target, packageJSONUrl, internal, base);
  if (!StringPrototypeStartsWith(target, "./")) {
    if (internal && !StringPrototypeStartsWith(target, "../") && !StringPrototypeStartsWith(target, "/")) {
      let isURL = false;
      try {
        new URL(target);
        isURL = true;
      } catch {
      }
      if (!isURL) {
        const exportTarget = pattern ? RegExpPrototypeSymbolReplace(patternRegEx, target, () => subpath) : target + subpath;
        return exportTarget;
      }
    }
    throwInvalidPackageTarget(match, target, packageJSONUrl, internal, base);
  }
  if (RegExpPrototypeExec(
    invalidSegmentRegEx,
    StringPrototypeSlice(target, 2)
  ) !== null)
    throwInvalidPackageTarget(match, target, packageJSONUrl, internal, base);
  const resolved = new URL(target, packageJSONUrl);
  const resolvedPath = resolved.pathname;
  const packagePath = new URL(".", packageJSONUrl).pathname;
  if (!StringPrototypeStartsWith(resolvedPath, packagePath))
    throwInvalidPackageTarget(match, target, packageJSONUrl, internal, base);
  if (subpath === "")
    return resolved;
  if (RegExpPrototypeExec(invalidSegmentRegEx, subpath) !== null) {
    const request = pattern ? StringPrototypeReplace(match, "*", () => subpath) : match + subpath;
    throwInvalidSubpath(request, packageJSONUrl, internal, base);
  }
  if (pattern) {
    return new URL(
      RegExpPrototypeSymbolReplace(patternRegEx, resolved.href, () => subpath)
    );
  }
  return new URL(subpath, resolved);
}
function isArrayIndex(key) {
  const keyNum = +key;
  if (`${keyNum}` !== key)
    return false;
  return keyNum >= 0 && keyNum < 4294967295;
}
function resolvePackageTarget(packageJSONUrl, target, subpath, packageSubpath, base, pattern, internal, conditions) {
  if (typeof target === "string") {
    return resolvePackageTargetString(
      target,
      subpath,
      packageSubpath,
      packageJSONUrl,
      base,
      pattern,
      internal);
  } else if (ArrayIsArray(target)) {
    if (target.length === 0) {
      return null;
    }
    let lastException;
    for (let i = 0; i < target.length; i++) {
      const targetItem = target[i];
      let resolveResult;
      try {
        resolveResult = resolvePackageTarget(
          packageJSONUrl,
          targetItem,
          subpath,
          packageSubpath,
          base,
          pattern,
          internal,
          conditions
        );
      } catch (e) {
        lastException = e;
        if (e.code === "ERR_INVALID_PACKAGE_TARGET") {
          continue;
        }
        throw e;
      }
      if (resolveResult === void 0) {
        continue;
      }
      if (resolveResult === null) {
        lastException = null;
        continue;
      }
      return resolveResult;
    }
    if (lastException === void 0 || lastException === null)
      return lastException;
    throw lastException;
  } else if (typeof target === "object" && target !== null) {
    const keys = ObjectGetOwnPropertyNames(target);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (isArrayIndex(key)) {
        throw new ERR_INVALID_PACKAGE_CONFIG(
          fileURLToPath(packageJSONUrl),
          base,
          '"exports" cannot contain numeric property keys.'
        );
      }
    }
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      if (key === "default" || conditions.has(key)) {
        const conditionalTarget = target[key];
        const resolveResult = resolvePackageTarget(
          packageJSONUrl,
          conditionalTarget,
          subpath,
          packageSubpath,
          base,
          pattern,
          internal,
          conditions
        );
        if (resolveResult === void 0)
          continue;
        return resolveResult;
      }
    }
    return void 0;
  } else if (target === null) {
    return null;
  }
  throwInvalidPackageTarget(
    packageSubpath,
    target,
    packageJSONUrl,
    internal,
    base
  );
}
function patternKeyCompare(a, b) {
  const aPatternIndex = StringPrototypeIndexOf(a, "*");
  const bPatternIndex = StringPrototypeIndexOf(b, "*");
  const baseLenA = aPatternIndex === -1 ? a.length : aPatternIndex + 1;
  const baseLenB = bPatternIndex === -1 ? b.length : bPatternIndex + 1;
  if (baseLenA > baseLenB)
    return -1;
  if (baseLenB > baseLenA)
    return 1;
  if (aPatternIndex === -1)
    return 1;
  if (bPatternIndex === -1)
    return -1;
  if (a.length > b.length)
    return -1;
  if (b.length > a.length)
    return 1;
  return 0;
}
function packageImportsResolve({
  name,
  base,
  conditions,
  readFileSyncFn
}) {
  if (name === "#" || StringPrototypeStartsWith(name, "#/") || StringPrototypeEndsWith(name, "/")) {
    const reason = "is not a valid internal imports specifier name";
    throw new ERR_INVALID_MODULE_SPECIFIER(name, reason, fileURLToPath(base));
  }
  let packageJSONUrl;
  const packageConfig = getPackageScopeConfig(base, readFileSyncFn);
  if (packageConfig.exists) {
    packageJSONUrl = pathToFileURL(packageConfig.pjsonPath);
    const imports = packageConfig.imports;
    if (imports) {
      if (ObjectPrototypeHasOwnProperty(imports, name) && !StringPrototypeIncludes(name, "*")) {
        const resolveResult = resolvePackageTarget(
          packageJSONUrl,
          imports[name],
          "",
          name,
          base,
          false,
          true,
          conditions
        );
        if (resolveResult != null) {
          return resolveResult;
        }
      } else {
        let bestMatch = "";
        let bestMatchSubpath;
        const keys = ObjectGetOwnPropertyNames(imports);
        for (let i = 0; i < keys.length; i++) {
          const key = keys[i];
          const patternIndex = StringPrototypeIndexOf(key, "*");
          if (patternIndex !== -1 && StringPrototypeStartsWith(
            name,
            StringPrototypeSlice(key, 0, patternIndex)
          )) {
            const patternTrailer = StringPrototypeSlice(key, patternIndex + 1);
            if (name.length >= key.length && StringPrototypeEndsWith(name, patternTrailer) && patternKeyCompare(bestMatch, key) === 1 && StringPrototypeLastIndexOf(key, "*") === patternIndex) {
              bestMatch = key;
              bestMatchSubpath = StringPrototypeSlice(
                name,
                patternIndex,
                name.length - patternTrailer.length
              );
            }
          }
        }
        if (bestMatch) {
          const target = imports[bestMatch];
          const resolveResult = resolvePackageTarget(
            packageJSONUrl,
            target,
            bestMatchSubpath,
            bestMatch,
            base,
            true,
            true,
            conditions
          );
          if (resolveResult != null) {
            return resolveResult;
          }
        }
      }
    }
  }
  throwImportNotDefined(name, packageJSONUrl, base);
}

const pathRegExp = /^(?![a-zA-Z]:[\\/]|\\\\|\.{0,2}(?:\/|$))((?:node:)?(?:@[^/]+\/)?[^/]+)\/*(.*|)$/;
const isRelativeRegexp = /^\.{0,2}\//;
function tryReadFile(filePath) {
  try {
    return fs.readFileSync(filePath, `utf8`);
  } catch (err) {
    if (err.code === `ENOENT`)
      return void 0;
    throw err;
  }
}
async function resolvePrivateRequest(specifier, issuer, context, nextResolve) {
  const resolved = packageImportsResolve({
    name: specifier,
    base: pathToFileURL(issuer),
    conditions: new Set(context.conditions),
    readFileSyncFn: tryReadFile
  });
  if (resolved instanceof URL) {
    return { url: resolved.href, shortCircuit: true };
  } else {
    if (resolved.startsWith(`#`))
      throw new Error(`Mapping from one private import to another isn't allowed`);
    return resolve$2(resolved, context, nextResolve);
  }
}
async function resolve$2(originalSpecifier, context, nextResolve) {
  var _a;
  const { findPnpApi } = moduleExports;
  if (!findPnpApi || isBuiltinModule(originalSpecifier))
    return nextResolve(originalSpecifier, context, nextResolve);
  let specifier = originalSpecifier;
  const url = tryParseURL(specifier, isRelativeRegexp.test(specifier) ? context.parentURL : void 0);
  if (url) {
    if (url.protocol !== `file:`)
      return nextResolve(originalSpecifier, context, nextResolve);
    specifier = fileURLToPath(url);
  }
  const { parentURL, conditions = [] } = context;
  const issuer = parentURL ? fileURLToPath(parentURL) : process.cwd();
  const pnpapi = (_a = findPnpApi(issuer)) != null ? _a : url ? findPnpApi(specifier) : null;
  if (!pnpapi)
    return nextResolve(originalSpecifier, context, nextResolve);
  if (specifier.startsWith(`#`))
    return resolvePrivateRequest(specifier, issuer, context, nextResolve);
  const dependencyNameMatch = specifier.match(pathRegExp);
  let allowLegacyResolve = false;
  if (dependencyNameMatch) {
    const [, dependencyName, subPath] = dependencyNameMatch;
    if (subPath === `` && dependencyName !== `pnpapi`) {
      const resolved = pnpapi.resolveToUnqualified(`${dependencyName}/package.json`, issuer);
      if (resolved) {
        const content = await tryReadFile$1(resolved);
        if (content) {
          const pkg = JSON.parse(content);
          allowLegacyResolve = pkg.exports == null;
        }
      }
    }
  }
  const result = pnpapi.resolveRequest(specifier, issuer, {
    conditions: new Set(conditions),
    extensions: allowLegacyResolve ? void 0 : []
  });
  if (!result)
    throw new Error(`Resolving '${specifier}' from '${issuer}' failed`);
  const resultURL = pathToFileURL(result);
  if (url) {
    resultURL.search = url.search;
    resultURL.hash = url.hash;
  }
  if (!parentURL)
    setEntrypointPath(fileURLToPath(resultURL));
  return {
    url: resultURL.href,
    shortCircuit: true
  };
}

async function resolve$1(originalSpecifier, context, nextResolve) {
  const tsSpecifier = originalSpecifier.replace(/\.(c|m)?js$/, '.$1ts').replace(/\.(c|m)?jsx$/, '.$1tsx');
  try {
    return await resolve$2(tsSpecifier, context, nextResolve);
  } catch (err) {
    if (tsSpecifier === originalSpecifier)
      throw err;
    return await resolve$2(originalSpecifier, context, nextResolve);
  }
}

const binding = process.binding(`fs`);
const originalfstat = binding.fstat;
const ZIP_MASK = 4278190080;
const ZIP_MAGIC = 704643072;
binding.fstat = function(...args) {
  const [fd, useBigint, req] = args;
  if ((fd & ZIP_MASK) === ZIP_MAGIC && useBigint === false && req === void 0) {
    try {
      const stats = fs.fstatSync(fd);
      return new Float64Array([
        stats.dev,
        stats.mode,
        stats.nlink,
        stats.uid,
        stats.gid,
        stats.rdev,
        stats.blksize,
        stats.ino,
        stats.size,
        stats.blocks
      ]);
    } catch {
    }
  }
  return originalfstat.apply(this, args);
};

const resolve = resolve$1;
const getFormat = HAS_CONSOLIDATED_HOOKS ? void 0 : getFormat$1;
const getSource = HAS_CONSOLIDATED_HOOKS ? void 0 : getSource$1;
const load = HAS_CONSOLIDATED_HOOKS ? load$1 : void 0;

export { getFormat, getSource, load, resolve };
