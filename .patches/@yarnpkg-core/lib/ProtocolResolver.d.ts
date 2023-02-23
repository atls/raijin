import { Resolver, ResolveOptions, MinimalResolveOptions } from '@yarnpkg/core';
import { Descriptor, Locator, DescriptorHash, Package } from './types';
export declare const TAG_REGEXP: RegExp;
export declare class ProtocolResolver implements Resolver {
    supportsDescriptor(descriptor: Descriptor, opts: MinimalResolveOptions): boolean;
    supportsLocator(locator: Locator, opts: MinimalResolveOptions): boolean;
    shouldPersistResolution(locator: Locator, opts: MinimalResolveOptions): boolean;
    bindDescriptor(descriptor: Descriptor, fromLocator: Locator, opts: MinimalResolveOptions): import("@yarnpkg/core").Descriptor;
    getResolutionDependencies(descriptor: Descriptor, opts: MinimalResolveOptions): Record<string, import("@yarnpkg/core").Descriptor>;
    getCandidates(descriptor: Descriptor, dependencies: Map<DescriptorHash, Package>, opts: ResolveOptions): Promise<import("@yarnpkg/core").Locator[]>;
    getSatisfying(descriptor: Descriptor, references: Array<string>, opts: ResolveOptions): Promise<{
        locators: import("@yarnpkg/core").Locator[];
        sorted: boolean;
    }>;
    resolve(locator: Locator, opts: ResolveOptions): Promise<any>;
    private forwardDescriptor;
    private forwardLocator;
}
