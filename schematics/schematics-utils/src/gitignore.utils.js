const GITIGNORE_PATH = '.gitignore';
export const updateGitIgnoreInTree = (callback) => (host, context) => {
    if (!host.exists(GITIGNORE_PATH)) {
        host.create(GITIGNORE_PATH, '');
    }
    const content = host.read(GITIGNORE_PATH).toString('utf-8').split('\n');
    host.overwrite(GITIGNORE_PATH, Array.from(callback(content, context)).join('\n'));
    return host;
};
