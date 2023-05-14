import { WorkspaceResolver } from '@yarnpkg/core';
import { WorkspaceFetcher } from '@yarnpkg/core';
import { PortablePath } from '@yarnpkg/fslib';
import { genPackZip } from './exportUtils';
export class WorkspacePackFetcher extends WorkspaceFetcher {
    constructor(originalProject) {
        super();
        this.originalProject = originalProject;
    }
    getLocalPath(locator, opts) {
        return super.getLocalPath(locator, this.rewriteOpts(locator, opts));
    }
    async fetch(locator, opts) {
        if (locator.reference.slice(WorkspaceResolver.protocol.length) === `.`)
            return await super.fetch(locator, opts);
        const expectedChecksum = opts.checksums.get(locator.locatorHash) || null;
        const [packageFs, releaseFs] = await opts.cache.fetchPackageFromCache(locator, expectedChecksum, {
            loader: () => this.packWorkspace(locator),
        });
        return {
            packageFs,
            releaseFs,
            localPath: this.getLocalPath(locator, opts),
            prefixPath: PortablePath.dot,
        };
    }
    async packWorkspace(locator) {
        const workspace = this.originalProject.getWorkspaceByLocator(locator);
        return await genPackZip(workspace, {
            compressionLevel: this.originalProject.configuration.get(`compressionLevel`),
            stripComponents: 1,
        });
    }
    rewriteOpts(locator, opts) {
        return locator.reference.slice(WorkspaceResolver.protocol.length) === `.`
            ? opts
            : { ...opts, project: this.originalProject };
    }
}
