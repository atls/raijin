import { LinkType } from '@yarnpkg/core';
import { WorkspaceResolver } from '@yarnpkg/core';
export class WorkspacePackResolver extends WorkspaceResolver {
    constructor(originalProject) {
        super();
        this.originalProject = originalProject;
    }
    supportsDescriptor(descriptor, opts) {
        return super.supportsDescriptor(descriptor, this.rewriteOpts(descriptor, opts));
    }
    supportsLocator(locator, opts) {
        return super.supportsLocator(locator, this.rewriteOpts(locator, opts));
    }
    shouldPersistResolution(locator, opts) {
        return super.shouldPersistResolution(locator, this.rewriteOpts(locator, opts));
    }
    bindDescriptor(descriptor, fromLocator, opts) {
        return super.bindDescriptor(descriptor, fromLocator, this.rewriteOpts(descriptor, opts));
    }
    getResolutionDependencies(descriptor, opts) {
        return super.getResolutionDependencies(descriptor, this.rewriteOpts(descriptor, opts));
    }
    async getCandidates(descriptor, dependencies, opts) {
        return await super.getCandidates(descriptor, dependencies, this.rewriteOpts(descriptor, opts));
    }
    async getSatisfying(descriptor, references, opts) {
        return await super.getSatisfying(descriptor, references, this.rewriteOpts(descriptor, opts));
    }
    async resolve(locator, opts) {
        const path = locator.reference.slice(WorkspaceResolver.protocol.length);
        const { project } = this.rewriteOpts(locator, opts);
        const workspace = project.getWorkspaceByCwd(path);
        return {
            ...locator,
            version: workspace.manifest.version || `0.0.0`,
            languageName: `unknown`,
            linkType: path === `.` ? LinkType.SOFT : LinkType.HARD,
            dependencies: workspace.manifest.dependencies,
            peerDependencies: workspace.manifest.peerDependencies,
            dependenciesMeta: workspace.manifest.dependenciesMeta,
            peerDependenciesMeta: workspace.manifest.peerDependenciesMeta,
            bin: workspace.manifest.bin,
        };
    }
    rewriteOpts(descriptorOrLocator, opts) {
        const val = `descriptorHash` in descriptorOrLocator
            ? descriptorOrLocator.range
            : descriptorOrLocator.reference;
        return val.slice(WorkspaceResolver.protocol.length) === `.`
            ? opts
            : { ...opts, project: this.originalProject };
    }
}
