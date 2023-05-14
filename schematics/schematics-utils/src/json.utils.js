import stripJsonComments from 'strip-json-comments';
export const serializeJson = (json) => `${JSON.stringify(json, null, 2)}\n`;
export const readJsonInTree = (host, path) => {
    if (!host.exists(path)) {
        throw new Error(`Cannot find ${path}`);
    }
    const contents = stripJsonComments(host.read(path).toString('utf-8'));
    try {
        return JSON.parse(contents);
    }
    catch (error) {
        throw new Error(`Cannot parse ${path}: ${error.message}`);
    }
};
export const updateJsonInTree = (path, callback) => (host, context) => {
    if (!host.exists(path)) {
        host.create(path, serializeJson(callback({}, context)));
        return host;
    }
    host.overwrite(path, serializeJson(callback(readJsonInTree(host, path), context)));
    return host;
};
