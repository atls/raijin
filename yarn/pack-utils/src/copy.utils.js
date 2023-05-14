import { Manifest } from '@yarnpkg/core';
import { structUtils } from '@yarnpkg/core';
import { xfs } from '@yarnpkg/fslib';
import { ppath } from '@yarnpkg/fslib';
import { toFilename } from '@yarnpkg/fslib';
export const copyCacheMarkedFiles = async (project, cache, destination, report) => {
    for await (const src of cache.markedFiles) {
        const path = ppath.relative(project.cwd, src);
        report.reportInfo(null, path);
        await xfs.copyPromise(ppath.join(destination, path), src);
    }
};
export const copyManifests = async (workspaces, destination, report) => {
    for await (const ws of workspaces) {
        const path = ppath.join(ws.relativeCwd, Manifest.fileName);
        const dest = ppath.join(destination, path);
        const data = {};
        ws.manifest.exportTo(data);
        report.reportInfo(null, path);
        await xfs.mkdirpPromise(ppath.dirname(dest));
        await xfs.writeJsonPromise(dest, data);
    }
};
export const copyPlugins = async (project, destination, report) => {
    const pluginDir = ppath.join(toFilename('.yarn'), toFilename('plugins'));
    if (await xfs.existsPromise(ppath.join(project.cwd, pluginDir))) {
        report.reportInfo(null, pluginDir);
        await xfs.copyPromise(ppath.join(destination, pluginDir), ppath.join(project.cwd, pluginDir), {
            overwrite: true,
        });
    }
};
const BUILTIN_REGEXP = /^builtin<([^>]+)>$/;
export const copyProtocolFiles = async (project, destination, report, parseDescriptor) => {
    const copiedPaths = new Set();
    for await (const descriptor of project.storedDescriptors.values()) {
        const resolvedDescriptor = structUtils.isVirtualDescriptor(descriptor)
            ? structUtils.devirtualizeDescriptor(descriptor)
            : descriptor;
        const parsed = parseDescriptor(resolvedDescriptor);
        if (!parsed)
            continue;
        const { parentLocator, paths } = parsed;
        for await (const path of paths) {
            if (BUILTIN_REGEXP.test(path))
                continue;
            if (ppath.isAbsolute(path))
                continue;
            const parentWorkspace = project.getWorkspaceByLocator(parentLocator);
            const relativePath = ppath.join(parentWorkspace.relativeCwd, path);
            if (copiedPaths.has(relativePath))
                continue;
            copiedPaths.add(relativePath);
            const src = ppath.join(parentWorkspace.cwd, path);
            const dest = ppath.join(destination, relativePath);
            report.reportInfo(null, relativePath);
            await xfs.mkdirpPromise(ppath.dirname(dest));
            await xfs.copyFilePromise(src, dest);
        }
    }
};
export const copyRcFile = async (project, destination, report) => {
    const filename = project.configuration.get('rcFilename');
    report.reportInfo(null, filename);
    await xfs.copyPromise(ppath.join(destination, filename), ppath.join(project.cwd, filename), {
        overwrite: true,
    });
};
export const copyYarnRelease = async (project, destination, report) => {
    const src = project.configuration.get('yarnPath');
    const path = ppath.relative(project.cwd, src);
    const dest = ppath.join(destination, path);
    report.reportInfo(null, path);
    await xfs.copyPromise(dest, src, {
        overwrite: true,
    });
};
