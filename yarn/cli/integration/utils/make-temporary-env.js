import * as exec from './exec';
import * as fs from './fs';
import * as tests from './tests';
import { npath } from '@yarnpkg/fslib';
import { delimiter } from 'path';
const { generatePkgDriver } = tests;
const { execFile } = exec;
const { createTemporaryFolder } = fs;
export const makeTemporaryEnv = generatePkgDriver({
    getName() {
        return `yarn`;
    },
    async runDriver(path, [command, ...args], { cwd, projectFolder, registryUrl, env, ...config }) {
        const rcEnv = {};
        for (const [key, value] of Object.entries(config))
            rcEnv[`YARN_${key.replace(/([A-Z])/g, `_$1`).toUpperCase()}`] = Array.isArray(value)
                ? value.join(`;`)
                : value;
        const nativePath = npath.fromPortablePath(path);
        const tempHomeFolder = npath.fromPortablePath(await createTemporaryFolder());
        const cwdArgs = typeof projectFolder !== `undefined` ? [projectFolder] : [];
        const yarnBinary = require.resolve(`${__dirname}/../../bundles/yarn.js`);
        const res = await execFile(process.execPath, [yarnBinary, ...cwdArgs, command, ...args], {
            cwd: cwd || path,
            env: {
                [`HOME`]: tempHomeFolder,
                [`USERPROFILE`]: tempHomeFolder,
                [`PATH`]: `${nativePath}/bin${delimiter}${process.env.PATH}`,
                [`TEST_ENV`]: `true`,
                [`YARN_GLOBAL_FOLDER`]: `${nativePath}/.yarn/global`,
                [`YARN_ENABLE_TELEMETRY`]: `0`,
                [`YARN_CACHE_KEY_OVERRIDE`]: `0`,
                [`YARN_ENABLE_TIMERS`]: `false`,
                [`YARN_ENABLE_PROGRESS_BARS`]: `false`,
                [`YARN_ENABLE_INLINE_BUILDS`]: `false`,
                [`YARN_PREFER_AGGREGATE_CACHE_INFO`]: `false`,
                [`YARN_PNP_FALLBACK_MODE`]: `none`,
                [`YARN_ENABLE_GLOBAL_CACHE`]: `true`,
                [`NODE_SKIP_PLATFORM_CHECK`]: `1`,
                ...rcEnv,
                ...env,
            },
        });
        if (process.env.JEST_LOG_SPAWNS) {
            console.log(`===== stdout:`);
            console.log(res.stdout);
            console.log(`===== stderr:`);
            console.log(res.stderr);
        }
        return res;
    },
});
