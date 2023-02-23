"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StreamReport = exports.formatNameWithHyperlink = exports.formatName = void 0;
const tslib_1 = require("tslib");
const slice_ansi_1 = tslib_1.__importDefault(require("@arcanis/slice-ansi"));
const ci_info_1 = tslib_1.__importDefault(require("ci-info"));
const MessageName_1 = require("./MessageName");
const Report_1 = require("./Report");
const formatUtils = tslib_1.__importStar(require("./formatUtils"));
const structUtils = tslib_1.__importStar(require("./structUtils"));
const PROGRESS_FRAMES = [`⠋`, `⠙`, `⠹`, `⠸`, `⠼`, `⠴`, `⠦`, `⠧`, `⠇`, `⠏`];
const PROGRESS_INTERVAL = 80;
const BASE_FORGETTABLE_NAMES = new Set([MessageName_1.MessageName.FETCH_NOT_CACHED, MessageName_1.MessageName.UNUSED_CACHE_ENTRY]);
const BASE_FORGETTABLE_BUFFER_SIZE = 5;
const GROUP = ci_info_1.default.GITHUB_ACTIONS
    ? { start: (what) => `::group::${what}\n`, end: (what) => `::endgroup::\n` }
    : ci_info_1.default.TRAVIS
        ? { start: (what) => `travis_fold:start:${what}\n`, end: (what) => `travis_fold:end:${what}\n` }
        : ci_info_1.default.GITLAB
            ? { start: (what) => `section_start:${Math.floor(Date.now() / 1000)}:${what.toLowerCase().replace(/\W+/g, `_`)}[collapsed=true]\r\x1b[0K${what}\n`, end: (what) => `section_end:${Math.floor(Date.now() / 1000)}:${what.toLowerCase().replace(/\W+/g, `_`)}\r\x1b[0K` }
            : null;
const now = new Date();
// We only want to support environments that will out-of-the-box accept the
// characters we want to use. Others can enforce the style from the project
// configuration.
const supportsEmojis = [`iTerm.app`, `Apple_Terminal`, `WarpTerminal`, `vscode`].includes(process.env.TERM_PROGRAM) || !!process.env.WT_SESSION;
const makeRecord = (obj) => obj;
const PROGRESS_STYLES = makeRecord({
    patrick: {
        date: [17, 3],
        chars: [`🍀`, `🌱`],
        size: 40,
    },
    simba: {
        date: [19, 7],
        chars: [`🦁`, `🌴`],
        size: 40,
    },
    jack: {
        date: [31, 10],
        chars: [`🎃`, `🦇`],
        size: 40,
    },
    hogsfather: {
        date: [31, 12],
        chars: [`🎉`, `🎄`],
        size: 40,
    },
    default: {
        chars: [`=`, `-`],
        size: 80,
    },
});
const defaultStyle = (supportsEmojis && Object.keys(PROGRESS_STYLES).find(name => {
    const style = PROGRESS_STYLES[name];
    if (style.date && (style.date[0] !== now.getDate() || style.date[1] !== now.getMonth() + 1))
        return false;
    return true;
})) || `default`;
function formatName(name, { configuration, json }) {
    if (!configuration.get(`enableMessageNames`))
        return ``;
    const num = name === null ? 0 : name;
    const label = (0, MessageName_1.stringifyMessageName)(num);
    if (!json && name === null) {
        return formatUtils.pretty(configuration, label, `grey`);
    }
    else {
        return label;
    }
}
exports.formatName = formatName;
function formatNameWithHyperlink(name, { configuration, json }) {
    const code = formatName(name, { configuration, json });
    if (!code)
        return code;
    // Don't print hyperlinks for the generic messages
    if (name === null || name === MessageName_1.MessageName.UNNAMED)
        return code;
    const desc = MessageName_1.MessageName[name];
    const href = `https://yarnpkg.com/advanced/error-codes#${code}---${desc}`.toLowerCase();
    return formatUtils.applyHyperlink(configuration, code, href);
}
exports.formatNameWithHyperlink = formatNameWithHyperlink;
class StreamReport extends Report_1.Report {
    static async start(opts, cb) {
        const report = new this(opts);
        const emitWarning = process.emitWarning;
        process.emitWarning = (message, name) => {
            if (typeof message !== `string`) {
                const error = message;
                message = error.message;
                name = name !== null && name !== void 0 ? name : error.name;
            }
            const fullMessage = typeof name !== `undefined`
                ? `${name}: ${message}`
                : message;
            report.reportWarning(MessageName_1.MessageName.UNNAMED, fullMessage);
        };
        try {
            await cb(report);
        }
        catch (error) {
            report.reportExceptionOnce(error);
        }
        finally {
            await report.finalize();
            process.emitWarning = emitWarning;
        }
        return report;
    }
    constructor({ configuration, stdout, json = false, includeNames = true, includePrefix = true, includeFooter = true, includeLogs = !json, includeInfos = includeLogs, includeWarnings = includeLogs, forgettableBufferSize = BASE_FORGETTABLE_BUFFER_SIZE, forgettableNames = new Set(), }) {
        super();
        this.uncommitted = new Set();
        this.cacheHitCount = 0;
        this.cacheMissCount = 0;
        this.lastCacheMiss = null;
        this.warningCount = 0;
        this.errorCount = 0;
        this.startTime = Date.now();
        this.indent = 0;
        this.progress = new Map();
        this.progressTime = 0;
        this.progressFrame = 0;
        this.progressTimeout = null;
        this.progressStyle = null;
        this.progressMaxScaledSize = null;
        this.forgettableLines = [];
        formatUtils.addLogFilterSupport(this, { configuration });
        this.configuration = configuration;
        this.forgettableBufferSize = forgettableBufferSize;
        this.forgettableNames = new Set([...forgettableNames, ...BASE_FORGETTABLE_NAMES]);
        this.includeNames = includeNames;
        this.includePrefix = includePrefix;
        this.includeFooter = includeFooter;
        this.includeInfos = includeInfos;
        this.includeWarnings = includeWarnings;
        this.json = json;
        this.stdout = stdout;
        // Setup progress
        if (configuration.get(`enableProgressBars`) && !json && stdout.isTTY && stdout.columns > 22) {
            const styleName = configuration.get(`progressBarStyle`) || defaultStyle;
            if (!Object.prototype.hasOwnProperty.call(PROGRESS_STYLES, styleName))
                throw new Error(`Assertion failed: Invalid progress bar style`);
            this.progressStyle = PROGRESS_STYLES[styleName];
            const PAD_LEFT = `➤ YN0000: ┌ `.length;
            const maxWidth = Math.max(0, Math.min(stdout.columns - PAD_LEFT, 80));
            this.progressMaxScaledSize = Math.floor(this.progressStyle.size * maxWidth / 80);
        }
    }
    hasErrors() {
        return this.errorCount > 0;
    }
    exitCode() {
        return this.hasErrors() ? 1 : 0;
    }
    reportCacheHit(locator) {
        this.cacheHitCount += 1;
    }
    reportCacheMiss(locator, message) {
        this.lastCacheMiss = locator;
        this.cacheMissCount += 1;
        if (typeof message !== `undefined` && !this.configuration.get(`preferAggregateCacheInfo`)) {
            this.reportInfo(MessageName_1.MessageName.FETCH_NOT_CACHED, message);
        }
    }
    startSectionSync({ reportHeader, reportFooter, skipIfEmpty }, cb) {
        const mark = { committed: false, action: () => {
                reportHeader === null || reportHeader === void 0 ? void 0 : reportHeader();
            } };
        if (skipIfEmpty) {
            this.uncommitted.add(mark);
        }
        else {
            mark.action();
            mark.committed = true;
        }
        const before = Date.now();
        try {
            return cb();
        }
        catch (error) {
            this.reportExceptionOnce(error);
            throw error;
        }
        finally {
            const after = Date.now();
            this.uncommitted.delete(mark);
            if (mark.committed) {
                reportFooter === null || reportFooter === void 0 ? void 0 : reportFooter(after - before);
            }
        }
    }
    async startSectionPromise({ reportHeader, reportFooter, skipIfEmpty }, cb) {
        const mark = { committed: false, action: () => {
                reportHeader === null || reportHeader === void 0 ? void 0 : reportHeader();
            } };
        if (skipIfEmpty) {
            this.uncommitted.add(mark);
        }
        else {
            mark.action();
            mark.committed = true;
        }
        const before = Date.now();
        try {
            return await cb();
        }
        catch (error) {
            this.reportExceptionOnce(error);
            throw error;
        }
        finally {
            const after = Date.now();
            this.uncommitted.delete(mark);
            if (mark.committed) {
                reportFooter === null || reportFooter === void 0 ? void 0 : reportFooter(after - before);
            }
        }
    }
    startTimerImpl(what, opts, cb) {
        const realOpts = typeof opts === `function` ? {} : opts;
        const realCb = typeof opts === `function` ? opts : cb;
        return {
            cb: realCb,
            reportHeader: () => {
                this.reportInfo(null, `┌ ${what}`);
                this.indent += 1;
                if (GROUP !== null && !this.json && this.includeInfos) {
                    this.stdout.write(GROUP.start(what));
                }
            },
            reportFooter: elapsedTime => {
                this.indent -= 1;
                if (GROUP !== null && !this.json && this.includeInfos)
                    this.stdout.write(GROUP.end(what));
                if (this.configuration.get(`enableTimers`) && elapsedTime > 200) {
                    this.reportInfo(null, `└ Completed in ${formatUtils.pretty(this.configuration, elapsedTime, formatUtils.Type.DURATION)}`);
                }
                else {
                    this.reportInfo(null, `└ Completed`);
                }
            },
            skipIfEmpty: realOpts.skipIfEmpty,
        };
    }
    startTimerSync(what, opts, cb) {
        const { cb: realCb, ...sectionOps } = this.startTimerImpl(what, opts, cb);
        return this.startSectionSync(sectionOps, realCb);
    }
    async startTimerPromise(what, opts, cb) {
        const { cb: realCb, ...sectionOps } = this.startTimerImpl(what, opts, cb);
        return this.startSectionPromise(sectionOps, realCb);
    }
    async startCacheReport(cb) {
        const cacheInfo = this.configuration.get(`preferAggregateCacheInfo`)
            ? { cacheHitCount: this.cacheHitCount, cacheMissCount: this.cacheMissCount }
            : null;
        try {
            return await cb();
        }
        catch (error) {
            this.reportExceptionOnce(error);
            throw error;
        }
        finally {
            if (cacheInfo !== null) {
                this.reportCacheChanges(cacheInfo);
            }
        }
    }
    reportSeparator() {
        if (this.indent === 0) {
            this.writeLineWithForgettableReset(``);
        }
        else {
            this.reportInfo(null, ``);
        }
    }
    reportInfo(name, text) {
        if (!this.includeInfos)
            return;
        this.commit();
        const formattedName = this.formatNameWithHyperlink(name);
        const prefix = formattedName ? `${formattedName}: ` : ``;
        const message = `${this.formatPrefix(prefix, `blueBright`)}${text}`;
        if (!this.json) {
            if (this.forgettableNames.has(name)) {
                this.forgettableLines.push(message);
                if (this.forgettableLines.length > this.forgettableBufferSize) {
                    while (this.forgettableLines.length > this.forgettableBufferSize)
                        this.forgettableLines.shift();
                    this.writeLines(this.forgettableLines, { truncate: true });
                }
                else {
                    this.writeLine(message, { truncate: true });
                }
            }
            else {
                this.writeLineWithForgettableReset(message);
            }
        }
        else {
            this.reportJson({ type: `info`, name, displayName: this.formatName(name), indent: this.formatIndent(), data: text });
        }
    }
    reportWarning(name, text) {
        this.warningCount += 1;
        if (!this.includeWarnings)
            return;
        this.commit();
        const formattedName = this.formatNameWithHyperlink(name);
        const prefix = formattedName ? `${formattedName}: ` : ``;
        if (!this.json) {
            this.writeLineWithForgettableReset(`${this.formatPrefix(prefix, `yellowBright`)}${text}`);
        }
        else {
            this.reportJson({ type: `warning`, name, displayName: this.formatName(name), indent: this.formatIndent(), data: text });
        }
    }
    reportError(name, text) {
        this.errorCount += 1;
        this.commit();
        const formattedName = this.formatNameWithHyperlink(name);
        const prefix = formattedName ? `${formattedName}: ` : ``;
        if (!this.json) {
            this.writeLineWithForgettableReset(`${this.formatPrefix(prefix, `redBright`)}${text}`, { truncate: false });
        }
        else {
            this.reportJson({ type: `error`, name, displayName: this.formatName(name), indent: this.formatIndent(), data: text });
        }
    }
    reportProgress(progressIt) {
        if (this.progressStyle === null)
            return { ...Promise.resolve(), stop: () => { } };
        if (progressIt.hasProgress && progressIt.hasTitle)
            throw new Error(`Unimplemented: Progress bars can't have both progress and titles.`);
        let stopped = false;
        const promise = Promise.resolve().then(async () => {
            const progressDefinition = {
                progress: progressIt.hasProgress ? 0 : undefined,
                title: progressIt.hasTitle ? `` : undefined,
            };
            this.progress.set(progressIt, {
                definition: progressDefinition,
                lastScaledSize: progressIt.hasProgress ? -1 : undefined,
                lastTitle: undefined,
            });
            this.refreshProgress({ delta: -1 });
            for await (const { progress, title } of progressIt) {
                if (stopped)
                    continue;
                if (progressDefinition.progress === progress && progressDefinition.title === title)
                    continue;
                progressDefinition.progress = progress;
                progressDefinition.title = title;
                this.refreshProgress();
            }
            stop();
        });
        const stop = () => {
            if (stopped)
                return;
            stopped = true;
            this.progress.delete(progressIt);
            this.refreshProgress({ delta: +1 });
        };
        return { ...promise, stop };
    }
    reportJson(data) {
        if (this.json) {
            this.writeLineWithForgettableReset(`${JSON.stringify(data)}`);
        }
    }
    async finalize() {
        if (!this.includeFooter)
            return;
        let installStatus = ``;
        if (this.errorCount > 0)
            installStatus = `Failed with errors`;
        else if (this.warningCount > 0)
            installStatus = `Done with warnings`;
        else
            installStatus = `Done`;
        const timing = formatUtils.pretty(this.configuration, Date.now() - this.startTime, formatUtils.Type.DURATION);
        const message = this.configuration.get(`enableTimers`)
            ? `${installStatus} in ${timing}`
            : installStatus;
        if (this.errorCount > 0) {
            this.reportError(MessageName_1.MessageName.UNNAMED, message);
        }
        else if (this.warningCount > 0) {
            this.reportWarning(MessageName_1.MessageName.UNNAMED, message);
        }
        else {
            this.reportInfo(MessageName_1.MessageName.UNNAMED, message);
        }
    }
    writeLine(str, { truncate } = {}) {
        this.clearProgress({ clear: true });
        this.stdout.write(`${this.truncate(str, { truncate })}\n`);
        this.writeProgress();
    }
    writeLineWithForgettableReset(str, { truncate } = {}) {
        this.forgettableLines = [];
        this.writeLine(str, { truncate });
    }
    writeLines(lines, { truncate } = {}) {
        this.clearProgress({ delta: lines.length });
        for (const line of lines)
            this.stdout.write(`${this.truncate(line, { truncate })}\n`);
        this.writeProgress();
    }
    reportCacheChanges({ cacheHitCount, cacheMissCount }) {
        const cacheHitDelta = this.cacheHitCount - cacheHitCount;
        const cacheMissDelta = this.cacheMissCount - cacheMissCount;
        if (cacheHitDelta === 0 && cacheMissDelta === 0)
            return;
        let fetchStatus = ``;
        if (this.cacheHitCount > 1)
            fetchStatus += `${this.cacheHitCount} packages were already cached`;
        else if (this.cacheHitCount === 1)
            fetchStatus += ` - one package was already cached`;
        else
            fetchStatus += `No packages were cached`;
        if (this.cacheHitCount > 0) {
            if (this.cacheMissCount > 1) {
                fetchStatus += `, ${this.cacheMissCount} had to be fetched`;
            }
            else if (this.cacheMissCount === 1) {
                fetchStatus += `, one had to be fetched (${structUtils.prettyLocator(this.configuration, this.lastCacheMiss)})`;
            }
        }
        else {
            if (this.cacheMissCount > 1) {
                fetchStatus += ` - ${this.cacheMissCount} packages had to be fetched`;
            }
            else if (this.cacheMissCount === 1) {
                fetchStatus += ` - one package had to be fetched (${structUtils.prettyLocator(this.configuration, this.lastCacheMiss)})`;
            }
        }
        this.reportInfo(MessageName_1.MessageName.FETCH_NOT_CACHED, fetchStatus);
    }
    commit() {
        const marks = this.uncommitted;
        this.uncommitted = new Set();
        for (const mark of marks) {
            mark.committed = true;
            mark.action();
        }
    }
    clearProgress({ delta = 0, clear = false }) {
        if (this.progressStyle === null)
            return;
        if (this.progress.size + delta > 0) {
            this.stdout.write(`\x1b[${this.progress.size + delta}A`);
            if (delta > 0 || clear) {
                this.stdout.write(`\x1b[0J`);
            }
        }
    }
    writeProgress() {
        if (this.progressStyle === null)
            return;
        if (this.progressTimeout !== null)
            clearTimeout(this.progressTimeout);
        this.progressTimeout = null;
        if (this.progress.size === 0)
            return;
        const now = Date.now();
        if (now - this.progressTime > PROGRESS_INTERVAL) {
            this.progressFrame = (this.progressFrame + 1) % PROGRESS_FRAMES.length;
            this.progressTime = now;
        }
        const spinner = PROGRESS_FRAMES[this.progressFrame];
        for (const progress of this.progress.values()) {
            let progressBar = ``;
            if (typeof progress.lastScaledSize !== `undefined`) {
                const ok = this.progressStyle.chars[0].repeat(progress.lastScaledSize);
                const ko = this.progressStyle.chars[1].repeat(this.progressMaxScaledSize - progress.lastScaledSize);
                progressBar = ` ${ok}${ko}`;
            }
            const formattedName = this.formatName(null);
            const prefix = formattedName ? `${formattedName}: ` : ``;
            const title = progress.definition.title ? ` ${progress.definition.title}` : ``;
            this.stdout.write(`${formatUtils.pretty(this.configuration, `➤`, `blueBright`)} ${prefix}${spinner}${progressBar}${title}\n`);
        }
        this.progressTimeout = setTimeout(() => {
            this.refreshProgress({ force: true });
        }, PROGRESS_INTERVAL);
    }
    refreshProgress({ delta = 0, force = false } = {}) {
        let needsUpdate = false;
        let needsClear = false;
        if (force || this.progress.size === 0) {
            needsUpdate = true;
        }
        else {
            for (const progress of this.progress.values()) {
                const refreshedScaledSize = typeof progress.definition.progress !== `undefined`
                    ? Math.trunc(this.progressMaxScaledSize * progress.definition.progress)
                    : undefined;
                const previousScaledSize = progress.lastScaledSize;
                progress.lastScaledSize = refreshedScaledSize;
                const previousTitle = progress.lastTitle;
                progress.lastTitle = progress.definition.title;
                if ((refreshedScaledSize !== previousScaledSize) || (needsClear = previousTitle !== progress.definition.title)) {
                    needsUpdate = true;
                    break;
                }
            }
        }
        if (needsUpdate) {
            this.clearProgress({ delta, clear: needsClear });
            this.writeProgress();
        }
    }
    truncate(str, { truncate } = {}) {
        if (this.progressStyle === null)
            truncate = false;
        if (typeof truncate === `undefined`)
            truncate = this.configuration.get(`preferTruncatedLines`);
        // The -1 is to account for terminals that would wrap after
        // the last column rather before the first overwrite
        if (truncate)
            str = (0, slice_ansi_1.default)(str, 0, this.stdout.columns - 1);
        return str;
    }
    formatName(name) {
        if (!this.includeNames)
            return ``;
        return formatName(name, {
            configuration: this.configuration,
            json: this.json,
        });
    }
    formatPrefix(prefix, caretColor) {
        return this.includePrefix ? `${formatUtils.pretty(this.configuration, `➤`, caretColor)} ${prefix}${this.formatIndent()}` : ``;
    }
    formatNameWithHyperlink(name) {
        if (!this.includeNames)
            return ``;
        return formatNameWithHyperlink(name, {
            configuration: this.configuration,
            json: this.json,
        });
    }
    formatIndent() {
        return `│ `.repeat(this.indent);
    }
}
exports.StreamReport = StreamReport;
