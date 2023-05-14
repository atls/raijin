export const updateFileInTree = (path, callback) => (host, context) => {
    if (host.exists(path)) {
        host.overwrite(path, callback(host.read(path).toString('utf-8'), context));
    }
    return host;
};
