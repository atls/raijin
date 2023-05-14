import { Cache } from '@yarnpkg/core';
import { WorkspaceResolver } from '@yarnpkg/core';
import { JailFS } from '@yarnpkg/fslib';
import { NodeFS } from '@yarnpkg/fslib';
import { PortablePath } from '@yarnpkg/fslib';
import { structUtils } from '@yarnpkg/core';
import { ppath } from '@yarnpkg/fslib';
import { xfs } from '@yarnpkg/fslib';
export class ExportCache extends Cache {
    constructor(cacheCwd, { configuration, nodeLinker, parentCache, }) {
        super(cacheCwd, { configuration });
        this.parentMirror = new Map();
        this.workspaceMutexes = new Map();
        this.nodeLinker = nodeLinker;
        this.parentCache = parentCache;
    }
    static async find(configuration, parentCache) {
        const nodeLinker = configuration.get(`nodeLinker`);
        const cache = new ExportCache(configuration.get(`cacheFolder`), {
            configuration,
            nodeLinker,
            parentCache,
        });
        await cache.setup();
        return cache;
    }
    getLocatorMirrorPath(locator) {
        var _a;
        return (_a = this.parentMirror.get(structUtils.slugifyLocator(locator))) !== null && _a !== void 0 ? _a : null;
    }
    async setup() {
        await super.setup();
        const directoryListing = await xfs.readdirPromise(this.parentCache.cwd, { withFileTypes: true });
        for (const entry of directoryListing) {
            let match;
            if (entry.isDirectory() || !(match = entry.name.match(/^(.*)-[a-f\d]+\.zip$/i)))
                continue;
            this.parentMirror.set(match[1], ppath.join(this.parentCache.cwd, entry.name));
        }
    }
    async fetchPackageFromCache(locator, expectedChecksum, { loader }) {
        const baseFs = new NodeFS();
        const loadWorkspaceThroughMutex = async () => {
            const cachePath = ppath.resolve(this.cwd, `../workspaces`, structUtils.stringifyIdent(locator));
            const mutexedLoad = async () => {
                const cacheExists = await baseFs.existsPromise(cachePath);
                if (!cacheExists) {
                    const zipFs = await loader();
                    await baseFs.copyPromise(cachePath, PortablePath.root, { baseFs: zipFs });
                    zipFs.discardAndClose();
                }
                return cachePath;
            };
            const mutex = mutexedLoad();
            this.workspaceMutexes.set(locator.locatorHash, mutex);
            try {
                return await mutex;
            }
            finally {
                this.workspaceMutexes.delete(locator.locatorHash);
            }
        };
        if (!locator.reference.startsWith(WorkspaceResolver.protocol)) {
            return await super.fetchPackageFromCache(locator, expectedChecksum, { loader });
        }
        else {
            for (let mutex; (mutex = this.workspaceMutexes.get(locator.locatorHash));)
                await mutex;
            const cachePath = await loadWorkspaceThroughMutex();
            return [new JailFS(cachePath, { baseFs }), () => { }, null];
        }
    }
}
