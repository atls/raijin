"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clean = exports.validRange = exports.satisfiesWithPrereleases = exports.SemVer = void 0;
const tslib_1 = require("tslib");
const semver_1 = tslib_1.__importDefault(require("semver"));
var semver_2 = require("semver");
Object.defineProperty(exports, "SemVer", { enumerable: true, get: function () { return semver_2.SemVer; } });
const satisfiesWithPrereleasesCache = new Map();
/**
 * Returns whether the given semver version satisfies the given range. Notably
 * this supports prerelease versions so that "2.0.0-rc.0" satisfies the range
 * ">=1.0.0", for example.
 *
 * This function exists because the semver.satisfies method does not include
 * pre releases. This means ranges such as * would not satisfy 1.0.0-rc. The
 * includePrerelease flag has a weird behavior and cannot be used (if you want
 * to try it out, just run the `semverUtils` testsuite using this flag instead
 * of our own implementation, and you'll see the failing cases).
 *
 * See https://github.com/yarnpkg/berry/issues/575 for more context.
 */
function satisfiesWithPrereleases(version, range, loose = false) {
    if (!version)
        return false;
    const key = `${range}${loose}`;
    let semverRange = satisfiesWithPrereleasesCache.get(key);
    if (typeof semverRange === `undefined`) {
        try {
            // eslint-disable-next-line no-restricted-properties
            semverRange = new semver_1.default.Range(range, { includePrerelease: true, loose });
        }
        catch {
            return false;
        }
        finally {
            satisfiesWithPrereleasesCache.set(key, semverRange || null);
        }
    }
    else if (semverRange === null) {
        return false;
    }
    let semverVersion;
    try {
        semverVersion = new semver_1.default.SemVer(version, semverRange);
    }
    catch (err) {
        return false;
    }
    if (semverRange.test(semverVersion))
        return true;
    if (semverVersion.prerelease)
        semverVersion.prerelease = [];
    // A range has multiple sets of comparators. A version must satisfy all
    // comparators in a set and at least one set to satisfy the range.
    return semverRange.set.some(comparatorSet => {
        for (const comparator of comparatorSet)
            if (comparator.semver.prerelease)
                comparator.semver.prerelease = [];
        return comparatorSet.every(comparator => {
            return comparator.test(semverVersion);
        });
    });
}
exports.satisfiesWithPrereleases = satisfiesWithPrereleases;
const rangesCache = new Map();
/**
 * A cached version of `new semver.Range(potentialRange)` that returns `null` on invalid ranges
 */
function validRange(potentialRange) {
    if (potentialRange.indexOf(`:`) !== -1)
        return null;
    let range = rangesCache.get(potentialRange);
    if (typeof range !== `undefined`)
        return range;
    try {
        // eslint-disable-next-line no-restricted-properties
        range = new semver_1.default.Range(potentialRange);
    }
    catch {
        range = null;
    }
    rangesCache.set(potentialRange, range);
    return range;
}
exports.validRange = validRange;
/**
 The RegExp from https://semver.org/ but modified to
 - allow the version to start with `(?:[\sv=]*?)`
 - allow the version to end with `(?:\s*)`
 - place the valid version in capture group one
 */
const CLEAN_SEMVER_REGEXP = /^(?:[\sv=]*?)((0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?)(?:\s*)$/;
/**
 * Cleans the potential version by removing leading/trailing whitespace and '=v' prefix
 * @returns A valid SemVer string, otherwise null
 */
function clean(potentialVersion) {
    const version = CLEAN_SEMVER_REGEXP.exec(potentialVersion);
    return version ? version[1] : null;
}
exports.clean = clean;
