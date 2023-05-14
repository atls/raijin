import { load } from 'js-yaml';
import { dump } from 'js-yaml';
export const readYamlInTree = (host, path) => {
    if (!host.exists(path)) {
        throw new Error(`Cannot find ${path}`);
    }
    return load(host.read(path).toString('utf-8'));
};
export const updateYamlInTree = (path, callback) => (host, context) => {
    if (!host.exists(path)) {
        return host;
    }
    host.overwrite(path, dump(callback(readYamlInTree(host, path), context), { noArrayIndent: true, lineWidth: -1 }));
    return host;
};
