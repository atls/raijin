"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Manifest = void 0;
const tslib_1 = require("tslib");
const fslib_1 = require("@yarnpkg/fslib");
const parsers_1 = require("@yarnpkg/parsers");
const semver_1 = tslib_1.__importDefault(require("semver"));
const WorkspaceResolver_1 = require("./WorkspaceResolver");
const miscUtils = tslib_1.__importStar(require("./miscUtils"));
const semverUtils = tslib_1.__importStar(require("./semverUtils"));
const structUtils = tslib_1.__importStar(require("./structUtils"));
class Manifest {
    constructor() {
        this.indent = `  `;
        this.name = null;
        this.version = null;
        this.os = null;
        this.cpu = null;
        this.libc = null;
        this.type = null;
        this.packageManager = null;
        this["private"] = false;
        this.license = null;
        this.main = null;
        this.module = null;
        this.browser = null;
        this.languageName = null;
        this.bin = new Map();
        this.scripts = new Map();
        this.dependencies = new Map();
        this.devDependencies = new Map();
        this.peerDependencies = new Map();
        this.workspaceDefinitions = [];
        this.dependenciesMeta = new Map();
        this.peerDependenciesMeta = new Map();
        this.resolutions = [];
        this.files = null;
        this.publishConfig = null;
        this.installConfig = null;
        this.preferUnplugged = null;
        this.raw = {};
        /**
         * errors found in the raw manifest while loading
         */
        this.errors = [];
    }
    static async tryFind(path, { baseFs = new fslib_1.NodeFS() } = {}) {
        const manifestPath = fslib_1.ppath.join(path, `package.json`);
        try {
            return await Manifest.fromFile(manifestPath, { baseFs });
        }
        catch (err) {
            if (err.code === `ENOENT`)
                return null;
            throw err;
        }
    }
    static async find(path, { baseFs } = {}) {
        const manifest = await Manifest.tryFind(path, { baseFs });
        if (manifest === null)
            throw new Error(`Manifest not found`);
        return manifest;
    }
    static async fromFile(path, { baseFs = new fslib_1.NodeFS() } = {}) {
        const manifest = new Manifest();
        await manifest.loadFile(path, { baseFs });
        return manifest;
    }
    static fromText(text) {
        const manifest = new Manifest();
        manifest.loadFromText(text);
        return manifest;
    }
    loadFromText(text) {
        let data;
        try {
            data = JSON.parse(stripBOM(text) || `{}`);
        }
        catch (error) {
            error.message += ` (when parsing ${text})`;
            throw error;
        }
        this.load(data);
        this.indent = getIndent(text);
    }
    async loadFile(path, { baseFs = new fslib_1.NodeFS() }) {
        const content = await baseFs.readFilePromise(path, `utf8`);
        let data;
        try {
            data = JSON.parse(stripBOM(content) || `{}`);
        }
        catch (error) {
            error.message += ` (when parsing ${path})`;
            throw error;
        }
        this.load(data);
        this.indent = getIndent(content);
    }
    load(data, { yamlCompatibilityMode = false } = {}) {
        if (typeof data !== `object` || data === null)
            throw new Error(`Utterly invalid manifest data (${data})`);
        this.raw = data;
        const errors = [];
        this.name = null;
        if (typeof data.name === `string`) {
            try {
                this.name = structUtils.parseIdent(data.name);
            }
            catch (error) {
                errors.push(new Error(`Parsing failed for the 'name' field`));
            }
        }
        if (typeof data.version === `string`)
            this.version = data.version;
        else
            this.version = null;
        if (Array.isArray(data.os)) {
            const os = [];
            this.os = os;
            for (const item of data.os) {
                if (typeof item !== `string`) {
                    errors.push(new Error(`Parsing failed for the 'os' field`));
                }
                else {
                    os.push(item);
                }
            }
        }
        else {
            this.os = null;
        }
        if (Array.isArray(data.cpu)) {
            const cpu = [];
            this.cpu = cpu;
            for (const item of data.cpu) {
                if (typeof item !== `string`) {
                    errors.push(new Error(`Parsing failed for the 'cpu' field`));
                }
                else {
                    cpu.push(item);
                }
            }
        }
        else {
            this.cpu = null;
        }
        if (Array.isArray(data.libc)) {
            const libc = [];
            this.libc = libc;
            for (const item of data.libc) {
                if (typeof item !== `string`) {
                    errors.push(new Error(`Parsing failed for the 'libc' field`));
                }
                else {
                    libc.push(item);
                }
            }
        }
        else {
            this.libc = null;
        }
        if (typeof data.type === `string`)
            this.type = data.type;
        else
            this.type = null;
        if (typeof data.packageManager === `string`)
            this.packageManager = data.packageManager;
        else
            this.packageManager = null;
        if (typeof data.private === `boolean`)
            this.private = data.private;
        else
            this.private = false;
        if (typeof data.license === `string`)
            this.license = data.license;
        else
            this.license = null;
        if (typeof data.languageName === `string`)
            this.languageName = data.languageName;
        else
            this.languageName = null;
        if (typeof data.main === `string`)
            this.main = normalizeSlashes(data.main);
        else
            this.main = null;
        if (typeof data.module === `string`)
            this.module = normalizeSlashes(data.module);
        else
            this.module = null;
        if (data.browser != null) {
            if (typeof data.browser === `string`) {
                this.browser = normalizeSlashes(data.browser);
            }
            else {
                this.browser = new Map();
                for (const [key, value] of Object.entries(data.browser)) {
                    this.browser.set(normalizeSlashes(key), typeof value === `string` ? normalizeSlashes(value) : value);
                }
            }
        }
        else {
            this.browser = null;
        }
        this.bin = new Map();
        if (typeof data.bin === `string`) {
            if (this.name !== null) {
                this.bin.set(this.name.name, normalizeSlashes(data.bin));
            }
            else {
                errors.push(new Error(`String bin field, but no attached package name`));
            }
        }
        else if (typeof data.bin === `object` && data.bin !== null) {
            for (const [key, value] of Object.entries(data.bin)) {
                if (typeof value !== `string`) {
                    errors.push(new Error(`Invalid bin definition for '${key}'`));
                    continue;
                }
                // Some registries incorrectly normalize the `bin` field of
                // scoped packages to be invalid filenames.
                // E.g. from
                // {
                //   "name": "@yarnpkg/doctor",
                //   "bin": "index.js"
                // }
                // to
                // {
                //   "name": "@yarnpkg/doctor",
                //   "bin": {
                //     "@yarnpkg/doctor": "index.js"
                //   }
                // }
                const binaryIdent = structUtils.parseIdent(key);
                this.bin.set(binaryIdent.name, normalizeSlashes(value));
            }
        }
        this.scripts = new Map();
        if (typeof data.scripts === `object` && data.scripts !== null) {
            for (const [key, value] of Object.entries(data.scripts)) {
                if (typeof value !== `string`) {
                    errors.push(new Error(`Invalid script definition for '${key}'`));
                    continue;
                }
                this.scripts.set(key, value);
            }
        }
        this.dependencies = new Map();
        if (typeof data.dependencies === `object` && data.dependencies !== null) {
            for (const [name, range] of Object.entries(data.dependencies)) {
                if (typeof range !== `string`) {
                    errors.push(new Error(`Invalid dependency range for '${name}'`));
                    continue;
                }
                let ident;
                try {
                    ident = structUtils.parseIdent(name);
                }
                catch (error) {
                    errors.push(new Error(`Parsing failed for the dependency name '${name}'`));
                    continue;
                }
                const descriptor = structUtils.makeDescriptor(ident, range);
                this.dependencies.set(descriptor.identHash, descriptor);
            }
        }
        this.devDependencies = new Map();
        if (typeof data.devDependencies === `object` && data.devDependencies !== null) {
            for (const [name, range] of Object.entries(data.devDependencies)) {
                if (typeof range !== `string`) {
                    errors.push(new Error(`Invalid dependency range for '${name}'`));
                    continue;
                }
                let ident;
                try {
                    ident = structUtils.parseIdent(name);
                }
                catch (error) {
                    errors.push(new Error(`Parsing failed for the dependency name '${name}'`));
                    continue;
                }
                const descriptor = structUtils.makeDescriptor(ident, range);
                this.devDependencies.set(descriptor.identHash, descriptor);
            }
        }
        this.peerDependencies = new Map();
        if (typeof data.peerDependencies === `object` && data.peerDependencies !== null) {
            for (let [name, range] of Object.entries(data.peerDependencies)) {
                let ident;
                try {
                    ident = structUtils.parseIdent(name);
                }
                catch (error) {
                    errors.push(new Error(`Parsing failed for the dependency name '${name}'`));
                    continue;
                }
                if (typeof range !== `string` || (!range.startsWith(WorkspaceResolver_1.WorkspaceResolver.protocol) && !semverUtils.validRange(range))) {
                    errors.push(new Error(`Invalid dependency range for '${name}'`));
                    range = `*`;
                }
                const descriptor = structUtils.makeDescriptor(ident, range);
                this.peerDependencies.set(descriptor.identHash, descriptor);
            }
        }
        if (typeof data.workspaces === `object` && data.workspaces !== null && data.workspaces.nohoist)
            errors.push(new Error(`'nohoist' is deprecated, please use 'installConfig.hoistingLimits' instead`));
        const workspaces = Array.isArray(data.workspaces)
            ? data.workspaces
            : typeof data.workspaces === `object` && data.workspaces !== null && Array.isArray(data.workspaces.packages)
                ? data.workspaces.packages
                : [];
        this.workspaceDefinitions = [];
        for (const entry of workspaces) {
            if (typeof entry !== `string`) {
                errors.push(new Error(`Invalid workspace definition for '${entry}'`));
                continue;
            }
            this.workspaceDefinitions.push({
                pattern: entry,
            });
        }
        this.dependenciesMeta = new Map();
        if (typeof data.dependenciesMeta === `object` && data.dependenciesMeta !== null) {
            for (const [pattern, meta] of Object.entries(data.dependenciesMeta)) {
                if (typeof meta !== `object` || meta === null) {
                    errors.push(new Error(`Invalid meta field for '${pattern}`));
                    continue;
                }
                const descriptor = structUtils.parseDescriptor(pattern);
                const dependencyMeta = this.ensureDependencyMeta(descriptor);
                const built = tryParseOptionalBoolean(meta.built, { yamlCompatibilityMode });
                if (built === null) {
                    errors.push(new Error(`Invalid built meta field for '${pattern}'`));
                    continue;
                }
                const optional = tryParseOptionalBoolean(meta.optional, { yamlCompatibilityMode });
                if (optional === null) {
                    errors.push(new Error(`Invalid optional meta field for '${pattern}'`));
                    continue;
                }
                const unplugged = tryParseOptionalBoolean(meta.unplugged, { yamlCompatibilityMode });
                if (unplugged === null) {
                    errors.push(new Error(`Invalid unplugged meta field for '${pattern}'`));
                    continue;
                }
                Object.assign(dependencyMeta, { built, optional, unplugged });
            }
        }
        this.peerDependenciesMeta = new Map();
        if (typeof data.peerDependenciesMeta === `object` && data.peerDependenciesMeta !== null) {
            for (const [pattern, meta] of Object.entries(data.peerDependenciesMeta)) {
                if (typeof meta !== `object` || meta === null) {
                    errors.push(new Error(`Invalid meta field for '${pattern}'`));
                    continue;
                }
                const descriptor = structUtils.parseDescriptor(pattern);
                const peerDependencyMeta = this.ensurePeerDependencyMeta(descriptor);
                const optional = tryParseOptionalBoolean(meta.optional, { yamlCompatibilityMode });
                if (optional === null) {
                    errors.push(new Error(`Invalid optional meta field for '${pattern}'`));
                    continue;
                }
                Object.assign(peerDependencyMeta, { optional });
            }
        }
        this.resolutions = [];
        if (typeof data.resolutions === `object` && data.resolutions !== null) {
            for (const [pattern, reference] of Object.entries(data.resolutions)) {
                if (typeof reference !== `string`) {
                    errors.push(new Error(`Invalid resolution entry for '${pattern}'`));
                    continue;
                }
                try {
                    this.resolutions.push({ pattern: (0, parsers_1.parseResolution)(pattern), reference });
                }
                catch (error) {
                    errors.push(error);
                    continue;
                }
            }
        }
        if (Array.isArray(data.files)) {
            this.files = new Set();
            for (const filename of data.files) {
                if (typeof filename !== `string`) {
                    errors.push(new Error(`Invalid files entry for '${filename}'`));
                    continue;
                }
                this.files.add(filename);
            }
        }
        else {
            this.files = null;
        }
        if (typeof data.publishConfig === `object` && data.publishConfig !== null) {
            this.publishConfig = {};
            if (typeof data.publishConfig.access === `string`)
                this.publishConfig.access = data.publishConfig.access;
            if (typeof data.publishConfig.main === `string`)
                this.publishConfig.main = normalizeSlashes(data.publishConfig.main);
            if (typeof data.publishConfig.module === `string`)
                this.publishConfig.module = normalizeSlashes(data.publishConfig.module);
            if (data.publishConfig.browser != null) {
                if (typeof data.publishConfig.browser === `string`) {
                    this.publishConfig.browser = normalizeSlashes(data.publishConfig.browser);
                }
                else {
                    this.publishConfig.browser = new Map();
                    for (const [key, value] of Object.entries(data.publishConfig.browser)) {
                        this.publishConfig.browser.set(normalizeSlashes(key), typeof value === `string` ? normalizeSlashes(value) : value);
                    }
                }
            }
            if (typeof data.publishConfig.registry === `string`)
                this.publishConfig.registry = data.publishConfig.registry;
            if (typeof data.publishConfig.bin === `string`) {
                if (this.name !== null) {
                    this.publishConfig.bin = new Map([[this.name.name, normalizeSlashes(data.publishConfig.bin)]]);
                }
                else {
                    errors.push(new Error(`String bin field, but no attached package name`));
                }
            }
            else if (typeof data.publishConfig.bin === `object` && data.publishConfig.bin !== null) {
                this.publishConfig.bin = new Map();
                for (const [key, value] of Object.entries(data.publishConfig.bin)) {
                    if (typeof value !== `string`) {
                        errors.push(new Error(`Invalid bin definition for '${key}'`));
                        continue;
                    }
                    this.publishConfig.bin.set(key, normalizeSlashes(value));
                }
            }
            if (Array.isArray(data.publishConfig.executableFiles)) {
                this.publishConfig.executableFiles = new Set();
                for (const value of data.publishConfig.executableFiles) {
                    if (typeof value !== `string`) {
                        errors.push(new Error(`Invalid executable file definition`));
                        continue;
                    }
                    this.publishConfig.executableFiles.add(normalizeSlashes(value));
                }
            }
        }
        else {
            this.publishConfig = null;
        }
        if (typeof data.installConfig === `object` && data.installConfig !== null) {
            this.installConfig = {};
            for (const key of Object.keys(data.installConfig)) {
                if (key === `hoistingLimits`) {
                    if (typeof data.installConfig.hoistingLimits === `string`) {
                        this.installConfig.hoistingLimits = data.installConfig.hoistingLimits;
                    }
                    else {
                        errors.push(new Error(`Invalid hoisting limits definition`));
                    }
                }
                else if (key == `selfReferences`) {
                    if (typeof data.installConfig.selfReferences == `boolean`) {
                        this.installConfig.selfReferences = data.installConfig.selfReferences;
                    }
                    else {
                        errors.push(new Error(`Invalid selfReferences definition, must be a boolean value`));
                    }
                }
                else {
                    errors.push(new Error(`Unrecognized installConfig key: ${key}`));
                }
            }
        }
        else {
            this.installConfig = null;
        }
        // We treat optional dependencies after both the regular dependency field
        // and the dependenciesMeta field have been generated (because we will
        // override them)
        if (typeof data.optionalDependencies === `object` && data.optionalDependencies !== null) {
            for (const [name, range] of Object.entries(data.optionalDependencies)) {
                if (typeof range !== `string`) {
                    errors.push(new Error(`Invalid dependency range for '${name}'`));
                    continue;
                }
                let ident;
                try {
                    ident = structUtils.parseIdent(name);
                }
                catch (error) {
                    errors.push(new Error(`Parsing failed for the dependency name '${name}'`));
                    continue;
                }
                // Note that we store the optional dependencies in the same store as
                // the one that keep the regular dependencies, because they're
                // effectively the same (the only difference is that optional
                // dependencies have an extra field set in dependenciesMeta).
                const realDescriptor = structUtils.makeDescriptor(ident, range);
                this.dependencies.set(realDescriptor.identHash, realDescriptor);
                const identDescriptor = structUtils.makeDescriptor(ident, `unknown`);
                const dependencyMeta = this.ensureDependencyMeta(identDescriptor);
                Object.assign(dependencyMeta, { optional: true });
            }
        }
        if (typeof data.preferUnplugged === `boolean`)
            this.preferUnplugged = data.preferUnplugged;
        else
            this.preferUnplugged = null;
        this.errors = errors;
    }
    getForScope(type) {
        switch (type) {
            case `dependencies`:
                return this.dependencies;
            case `devDependencies`:
                return this.devDependencies;
            case `peerDependencies`:
                return this.peerDependencies;
            default: {
                throw new Error(`Unsupported value ("${type}")`);
            }
        }
    }
    hasConsumerDependency(ident) {
        if (this.dependencies.has(ident.identHash))
            return true;
        if (this.peerDependencies.has(ident.identHash))
            return true;
        return false;
    }
    hasHardDependency(ident) {
        if (this.dependencies.has(ident.identHash))
            return true;
        if (this.devDependencies.has(ident.identHash))
            return true;
        return false;
    }
    hasSoftDependency(ident) {
        if (this.peerDependencies.has(ident.identHash))
            return true;
        return false;
    }
    hasDependency(ident) {
        if (this.hasHardDependency(ident))
            return true;
        if (this.hasSoftDependency(ident))
            return true;
        return false;
    }
    getConditions() {
        const fields = [];
        if (this.os && this.os.length > 0)
            fields.push(toConditionLine(`os`, this.os));
        if (this.cpu && this.cpu.length > 0)
            fields.push(toConditionLine(`cpu`, this.cpu));
        if (this.libc && this.libc.length > 0)
            fields.push(toConditionLine(`libc`, this.libc));
        return fields.length > 0 ? fields.join(` & `) : null;
    }
    ensureDependencyMeta(descriptor) {
        if (descriptor.range !== `unknown` && !semver_1.default.valid(descriptor.range))
            throw new Error(`Invalid meta field range for '${structUtils.stringifyDescriptor(descriptor)}'`);
        const identString = structUtils.stringifyIdent(descriptor);
        const range = descriptor.range !== `unknown` ? descriptor.range : null;
        let dependencyMetaSet = this.dependenciesMeta.get(identString);
        if (!dependencyMetaSet)
            this.dependenciesMeta.set(identString, dependencyMetaSet = new Map());
        let dependencyMeta = dependencyMetaSet.get(range);
        if (!dependencyMeta)
            dependencyMetaSet.set(range, dependencyMeta = {});
        return dependencyMeta;
    }
    ensurePeerDependencyMeta(descriptor) {
        if (descriptor.range !== `unknown`)
            throw new Error(`Invalid meta field range for '${structUtils.stringifyDescriptor(descriptor)}'`);
        const identString = structUtils.stringifyIdent(descriptor);
        let peerDependencyMeta = this.peerDependenciesMeta.get(identString);
        if (!peerDependencyMeta)
            this.peerDependenciesMeta.set(identString, peerDependencyMeta = {});
        return peerDependencyMeta;
    }
    setRawField(name, value, { after = [] } = {}) {
        const afterSet = new Set(after.filter(key => {
            return Object.prototype.hasOwnProperty.call(this.raw, key);
        }));
        if (afterSet.size === 0 || Object.prototype.hasOwnProperty.call(this.raw, name)) {
            this.raw[name] = value;
        }
        else {
            const oldRaw = this.raw;
            const newRaw = this.raw = {};
            let inserted = false;
            for (const key of Object.keys(oldRaw)) {
                newRaw[key] = oldRaw[key];
                if (!inserted) {
                    afterSet.delete(key);
                    if (afterSet.size === 0) {
                        newRaw[name] = value;
                        inserted = true;
                    }
                }
            }
        }
    }
    exportTo(data, { compatibilityMode = true } = {}) {
        var _a;
        // Note that we even set the fields that we re-set later; it
        // allows us to preserve the key ordering
        Object.assign(data, this.raw);
        if (this.name !== null)
            data.name = structUtils.stringifyIdent(this.name);
        else
            delete data.name;
        if (this.version !== null)
            data.version = this.version;
        else
            delete data.version;
        if (this.os !== null)
            data.os = this.os;
        else
            delete data.os;
        if (this.cpu !== null)
            data.cpu = this.cpu;
        else
            delete data.cpu;
        if (this.type !== null)
            data.type = this.type;
        else
            delete data.type;
        if (this.packageManager !== null)
            data.packageManager = this.packageManager;
        else
            delete data.packageManager;
        if (this.private)
            data.private = true;
        else
            delete data.private;
        if (this.license !== null)
            data.license = this.license;
        else
            delete data.license;
        if (this.languageName !== null)
            data.languageName = this.languageName;
        else
            delete data.languageName;
        if (this.main !== null)
            data.main = this.main;
        else
            delete data.main;
        if (this.module !== null)
            data.module = this.module;
        else
            delete data.module;
        if (this.browser !== null) {
            const browser = this.browser;
            if (typeof browser === `string`) {
                data.browser = browser;
            }
            else if (browser instanceof Map) {
                data.browser = Object.assign({}, ...Array.from(browser.keys()).sort().map(name => {
                    return { [name]: browser.get(name) };
                }));
            }
        }
        else {
            delete data.browser;
        }
        if (this.bin.size === 1 && this.name !== null && this.bin.has(this.name.name)) {
            data.bin = this.bin.get(this.name.name);
        }
        else if (this.bin.size > 0) {
            data.bin = Object.assign({}, ...Array.from(this.bin.keys()).sort().map(name => {
                return { [name]: this.bin.get(name) };
            }));
        }
        else {
            delete data.bin;
        }
        if (this.workspaceDefinitions.length > 0) {
            if (this.raw.workspaces && !Array.isArray(this.raw.workspaces)) {
                data.workspaces = { ...this.raw.workspaces, packages: this.workspaceDefinitions.map(({ pattern }) => pattern) };
            }
            else {
                data.workspaces = this.workspaceDefinitions.map(({ pattern }) => pattern);
            }
        }
        else if (this.raw.workspaces && !Array.isArray(this.raw.workspaces) && Object.keys(this.raw.workspaces).length > 0) {
            data.workspaces = this.raw.workspaces;
        }
        else {
            delete data.workspaces;
        }
        const regularDependencies = [];
        const optionalDependencies = [];
        for (const dependency of this.dependencies.values()) {
            const dependencyMetaSet = this.dependenciesMeta.get(structUtils.stringifyIdent(dependency));
            let isOptionallyBuilt = false;
            if (compatibilityMode) {
                if (dependencyMetaSet) {
                    const meta = dependencyMetaSet.get(null);
                    if (meta && meta.optional) {
                        isOptionallyBuilt = true;
                    }
                }
            }
            if (isOptionallyBuilt) {
                optionalDependencies.push(dependency);
            }
            else {
                regularDependencies.push(dependency);
            }
        }
        if (regularDependencies.length > 0) {
            data.dependencies = Object.assign({}, ...structUtils.sortDescriptors(regularDependencies).map(dependency => {
                return { [structUtils.stringifyIdent(dependency)]: dependency.range };
            }));
        }
        else {
            delete data.dependencies;
        }
        if (optionalDependencies.length > 0) {
            data.optionalDependencies = Object.assign({}, ...structUtils.sortDescriptors(optionalDependencies).map(dependency => {
                return { [structUtils.stringifyIdent(dependency)]: dependency.range };
            }));
        }
        else {
            delete data.optionalDependencies;
        }
        if (this.devDependencies.size > 0) {
            data.devDependencies = Object.assign({}, ...structUtils.sortDescriptors(this.devDependencies.values()).map(dependency => {
                return { [structUtils.stringifyIdent(dependency)]: dependency.range };
            }));
        }
        else {
            delete data.devDependencies;
        }
        if (this.peerDependencies.size > 0) {
            data.peerDependencies = Object.assign({}, ...structUtils.sortDescriptors(this.peerDependencies.values()).map(dependency => {
                return { [structUtils.stringifyIdent(dependency)]: dependency.range };
            }));
        }
        else {
            delete data.peerDependencies;
        }
        data.dependenciesMeta = {};
        for (const [identString, dependencyMetaSet] of miscUtils.sortMap(this.dependenciesMeta.entries(), ([identString, dependencyMetaSet]) => identString)) {
            for (const [range, meta] of miscUtils.sortMap(dependencyMetaSet.entries(), ([range, meta]) => range !== null ? `0${range}` : `1`)) {
                const key = range !== null
                    ? structUtils.stringifyDescriptor(structUtils.makeDescriptor(structUtils.parseIdent(identString), range))
                    : identString;
                const metaCopy = { ...meta };
                if (compatibilityMode && range === null)
                    delete metaCopy.optional;
                if (Object.keys(metaCopy).length === 0)
                    continue;
                data.dependenciesMeta[key] = metaCopy;
            }
        }
        if (Object.keys(data.dependenciesMeta).length === 0)
            delete data.dependenciesMeta;
        if (this.peerDependenciesMeta.size > 0) {
            data.peerDependenciesMeta = Object.assign({}, ...miscUtils.sortMap(this.peerDependenciesMeta.entries(), ([identString, meta]) => identString).map(([identString, meta]) => {
                return { [identString]: meta };
            }));
        }
        else {
            delete data.peerDependenciesMeta;
        }
        if (this.resolutions.length > 0) {
            data.resolutions = Object.assign({}, ...this.resolutions.map(({ pattern, reference }) => {
                return { [(0, parsers_1.stringifyResolution)(pattern)]: reference };
            }));
        }
        else {
            delete data.resolutions;
        }
        if (this.files !== null)
            data.files = Array.from(this.files);
        else
            delete data.files;
        if (this.preferUnplugged !== null)
            data.preferUnplugged = this.preferUnplugged;
        else
            delete data.preferUnplugged;
        if (this.scripts !== null && this.scripts.size > 0) {
            (_a = data.scripts) !== null && _a !== void 0 ? _a : (data.scripts = {});
            for (const existingScriptName of Object.keys(data.scripts))
                if (!this.scripts.has(existingScriptName))
                    delete data.scripts[existingScriptName];
            for (const [name, content] of this.scripts.entries()) {
                // Set one at a time in order to preserve implicitly-preserved ordering of existing scripts.
                data.scripts[name] = content;
            }
        }
        else {
            delete data.scripts;
        }
        return data;
    }
}
Manifest.fileName = `package.json`;
Manifest.allDependencies = [`dependencies`, `devDependencies`, `peerDependencies`];
Manifest.hardDependencies = [`dependencies`, `devDependencies`];
exports.Manifest = Manifest;
function getIndent(content) {
    const indentMatch = content.match(/^[ \t]+/m);
    if (indentMatch) {
        return indentMatch[0];
    }
    else {
        return `  `;
    }
}
function stripBOM(content) {
    if (content.charCodeAt(0) === 0xFEFF) {
        return content.slice(1);
    }
    else {
        return content;
    }
}
function normalizeSlashes(str) {
    return str.replace(/\\/g, `/`);
}
function tryParseOptionalBoolean(value, { yamlCompatibilityMode }) {
    if (yamlCompatibilityMode)
        return miscUtils.tryParseOptionalBoolean(value);
    if (typeof value === `undefined` || typeof value === `boolean`)
        return value;
    return null;
}
function toConditionToken(name, raw) {
    const index = raw.search(/[^!]/);
    if (index === -1)
        return `invalid`;
    const prefix = index % 2 === 0 ? `` : `!`;
    const value = raw.slice(index);
    return `${prefix}${name}=${value}`;
}
function toConditionLine(name, rawTokens) {
    if (rawTokens.length === 1) {
        return toConditionToken(name, rawTokens[0]);
    }
    else {
        return `(${rawTokens.map(raw => toConditionToken(name, raw)).join(` | `)})`;
    }
}