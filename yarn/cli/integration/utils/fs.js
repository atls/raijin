import { ppath } from '@yarnpkg/fslib';
import { xfs } from '@yarnpkg/fslib';
export const realpath = (source) => {
    return xfs.realpathPromise(source);
};
export const writeFile = async (target, body) => {
    await xfs.mkdirpPromise(ppath.dirname(target));
    await xfs.writeFilePromise(target, body);
};
export const writeJson = (target, object) => {
    return exports.writeFile(target, JSON.stringify(object));
};
export const createTemporaryFolder = async (name) => {
    let tmp = await xfs.mktempPromise();
    if (typeof name !== `undefined`) {
        tmp = ppath.join(tmp, name);
        await xfs.mkdirPromise(tmp);
    }
    return tmp;
};
