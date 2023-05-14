import { readFile } from 'node:fs/promises';
import { BaseCommand } from '@yarnpkg/cli';
import { Configuration } from '@yarnpkg/core';
import { Project } from '@yarnpkg/core';
import { StreamReport } from '@yarnpkg/core';
import { stringify } from '@iarna/toml';
import { execUtils } from '@yarnpkg/core';
import { xfs } from '@yarnpkg/fslib';
import { ppath } from '@yarnpkg/fslib';
import { toFilename } from '@yarnpkg/fslib';
import tempy from 'tempy';
import { Option } from 'clipanion';
import { join } from 'path';
import { tagUtils } from '@atls/code-pack';
import { packUtils } from '@atls/yarn-pack-utils';
const forRepository = async (repo) => {
    const descriptor = {
        project: {
            id: repo,
            name: repo,
            version: '0.0.1',
        },
        build: {
            exclude: ['.git', '.yarn/unplugged'],
        },
    };
    const descriptorPath = ppath.join(await xfs.mktempPromise(), toFilename('project.toml'));
    await xfs.writeFilePromise(descriptorPath, stringify(descriptor));
    return descriptorPath;
};
class ImagePackCommand extends BaseCommand {
    constructor() {
        super(...arguments);
        this.registry = Option.String('-r,--registry', { required: true });
        this.tagPolicy = Option.String('-t,--tag-policy');
        this.publish = Option.Boolean('-p,--publish', false);
    }
    async execute() {
        const configuration = await Configuration.find(this.context.cwd, this.context.plugins);
        const { project } = await Project.find(configuration, this.context.cwd);
        const workspace = project.getWorkspaceByFilePath(this.context.cwd);
        const commandReport = await StreamReport.start({
            configuration,
            stdout: this.context.stdout,
        }, async (report) => {
            if (this.isWorkspaceAllowedForBundle(workspace)) {
                const destination = tempy.directory();
                report.reportInfo(null, `Package workspace ${workspace.manifest.raw.name} to ${destination}`);
                await packUtils.pack(configuration, project, workspace, report, destination);
                const repo = workspace.manifest.raw.name.replace('@', '').replace(/\//g, '-');
                const image = `${this.registry}${repo}`;
                const content = await readFile(join(this.context.cwd, 'package.json'), 'utf-8');
                const { packConfiguration = {} } = JSON.parse(content);
                const tag = await tagUtils.getTag(this.tagPolicy || 'revision');
                const descriptorPath = await forRepository(repo);
                const buildpackVersion = packConfiguration.buildpackVersion || '0.0.4';
                const builderTag = packConfiguration.builderTag || 'buster-18.13';
                const args = [
                    'build',
                    `${image}:${tag}`,
                    '--verbose',
                    '--buildpack',
                    `atlantislab/buildpack-yarn-workspace:${buildpackVersion}`,
                    '--builder',
                    `atlantislab/builder-base:${builderTag}`,
                    '--descriptor',
                    descriptorPath,
                    '--tag',
                    `${image}:latest`,
                ];
                if (this.publish) {
                    args.push('--publish');
                }
                await execUtils.pipevp('pack', args, {
                    cwd: destination,
                    env: process.env,
                    stdin: this.context.stdin,
                    stdout: this.context.stdout,
                    stderr: this.context.stderr,
                    end: execUtils.EndStrategy.ErrorCode,
                });
            }
            else {
                report.reportInfo(null, `Workspace ${workspace.manifest.raw.name} not allowed for package.`);
            }
        });
        return commandReport.exitCode();
    }
    isWorkspaceAllowedForBundle(workspace) {
        const { scripts, name } = workspace.manifest;
        const buildCommand = scripts.get('build');
        const hasAllowedBuildScript = [
            'actl service build',
            'actl renderer build',
            'build-storybook',
            'next build',
            'builder build library',
            'app service build',
            'app renderer build',
            'service build',
            'renderer build',
        ].some((command) => buildCommand === null || buildCommand === void 0 ? void 0 : buildCommand.includes(command));
        return hasAllowedBuildScript && Boolean(name);
    }
}
ImagePackCommand.paths = [['image', 'pack']];
export { ImagePackCommand };
