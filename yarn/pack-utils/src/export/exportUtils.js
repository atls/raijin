import { VirtualFetcher } from '@yarnpkg/core';
import { MultiFetcher } from '@yarnpkg/core';
import { MultiResolver } from '@yarnpkg/core';
import { VirtualResolver } from '@yarnpkg/core';
import { CwdFS } from '@yarnpkg/fslib';
import { structUtils } from '@yarnpkg/core';
import { tgzUtils } from '@yarnpkg/core';
import { ppath } from '@yarnpkg/fslib';
import { xfs } from '@yarnpkg/fslib';
import { packUtils } from '@yarnpkg/plugin-pack';
import tar from 'tar-stream';
import { createGzip } from 'zlib';
import { WorkspacePackFetcher } from './WorkspacePackFetcher';
import { WorkspacePackResolver } from './WorkspacePackResolver';
export const makeFetcher = (project) => {
    const pluginFetchers = [];
    for (const plugin of project.configuration.plugins.values())
        for (const fetcher of plugin.fetchers || [])
            pluginFetchers.push(new fetcher());
    return new MultiFetcher([
        new VirtualFetcher(),
        new WorkspacePackFetcher(project),
        ...pluginFetchers,
    ]);
};
export const makeResolver = (project) => {
    const pluginResolvers = [];
    for (const plugin of project.configuration.plugins.values())
        for (const resolver of plugin.resolvers || [])
            pluginResolvers.push(new resolver());
    return new MultiResolver([
        new VirtualResolver(),
        new WorkspacePackResolver(project),
        ...pluginResolvers,
    ]);
};
export const makeExportDir = async ({ locator, project }) => {
    const exportCacheFolder = project.configuration.get(`exportCacheFolder`);
    const exportDir = ppath.resolve(exportCacheFolder, structUtils.slugifyIdent(locator));
    await xfs.mkdirPromise(exportDir, { recursive: true });
    return exportDir;
};
export const genPackTgz = async (workspace) => {
    const packDir = await xfs.mktempPromise();
    const pack = await packUtils.genPackStream(workspace);
    const target = ppath.join(packDir, `package.tgz`);
    const write = xfs.createWriteStream(target);
    pack.pipe(write);
    await new Promise((resolve) => {
        write.on(`finish`, resolve);
    });
    return xfs.readFilePromise(target);
};
export const genPackZip = async (workspace, opts) => {
    return await xfs.mktempPromise(async (packDir) => {
        const pack = await packUtils.genPackStream(workspace);
        const target = ppath.join(packDir, `package.tgz`);
        const write = xfs.createWriteStream(target);
        pack.pipe(write);
        await new Promise((resolve) => {
            write.on(`finish`, resolve);
        });
        const buffer = await xfs.readFilePromise(target);
        return await tgzUtils.convertToZip(buffer, opts);
    });
};
export const makeGzipFromDirectory = async (directory) => {
    const cwdFs = new CwdFS(directory);
    const files = [];
    for await (const p of cwdFs.genTraversePromise(directory, { stableSort: true }))
        files.push(p);
    const pack = tar.pack();
    process.nextTick(async () => {
        for (const fileRequest of files) {
            const file = ppath.relative(directory, fileRequest);
            const stat = await cwdFs.lstatPromise(fileRequest);
            const opts = { name: file, mtime: new Date(315532800000), mode: stat.mode };
            let resolveFn;
            let rejectFn;
            const awaitTarget = new Promise((resolve, reject) => {
                resolveFn = resolve;
                rejectFn = reject;
            });
            const cb = (error) => {
                if (error) {
                    rejectFn(error);
                }
                else {
                    resolveFn();
                }
            };
            if (stat.isFile())
                pack.entry({ ...opts, type: `file` }, await cwdFs.readFilePromise(file), cb);
            else if (stat.isSymbolicLink())
                pack.entry({ ...opts, type: `symlink`, linkname: await cwdFs.readlinkPromise(file) }, cb);
            await awaitTarget;
        }
        pack.finalize();
    });
    const tgz = createGzip();
    pack.pipe(tgz);
    return tgz;
};
