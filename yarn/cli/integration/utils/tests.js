import * as fsUtils from './fs';
import { npath } from '@yarnpkg/fslib';
const deepResolve = require(`super-resolve`);
export const generatePkgDriver = ({ getName, runDriver, }) => {
    const withConfig = (definition) => {
        const makeTemporaryEnv = (packageJson, subDefinition, fn) => {
            if (typeof subDefinition === `function`) {
                fn = subDefinition;
                subDefinition = {};
            }
            if (typeof fn !== `function`) {
                throw new Error(`Invalid test function (got ${typeof fn}) - you probably put the closing parenthesis of the "makeTemporaryEnv" utility at the wrong place`);
            }
            return Object.assign(async () => {
                const path = await fsUtils.realpath(await fsUtils.createTemporaryFolder());
                await fsUtils.writeJson(npath.toPortablePath(`${path}/package.json`), await deepResolve(packageJson));
                const run = (...args) => {
                    let callDefinition = {};
                    if (args.length > 0 && typeof args[args.length - 1] === `object`)
                        callDefinition = args.pop();
                    return runDriver(path, args, {
                        ...definition,
                        ...subDefinition,
                        ...callDefinition,
                    });
                };
                const source = async (script, callDefinition = {}) => {
                    const scriptWrapper = `
              Promise.resolve().then(async () => ${script}).then(result => {
                return {type: 'success', result};
              }, err => {
                if (!(err instanceof Error))
                  return err;
                const copy = {message: err.message};
                if (err.code)
                  copy.code = err.code;
                if (err.pnpCode)
                  copy.pnpCode = err.pnpCode;
                return {type: 'failure', result: copy};
              }).then(payload => {
                console.log(JSON.stringify(payload));
              })
            `.replace(/\n/g, ``);
                    const result = await run(`node`, `-e`, scriptWrapper, callDefinition);
                    const content = result.stdout.toString();
                    let data;
                    try {
                        data = JSON.parse(content);
                    }
                    catch {
                        throw new Error(`Error when parsing JSON payload (${content})`);
                    }
                    if (data.type === `failure`) {
                        throw { externalException: data.result };
                    }
                    else {
                        return data.result;
                    }
                };
                try {
                    await fn({ path, run, source });
                }
                catch (error) {
                    ;
                    error.message = `Temporary fixture folder: ${npath.fromPortablePath(path)}\n\n${error.message}`;
                    throw error;
                }
            });
        };
        makeTemporaryEnv.getPackageManagerName = () => {
            return getName();
        };
        makeTemporaryEnv.withConfig = (subDefinition) => {
            return withConfig({ ...definition, ...subDefinition });
        };
        return makeTemporaryEnv;
    };
    return withConfig({});
};
