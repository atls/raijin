import { context } from '@actions/github';
import { getOctokit } from '@actions/github';
import { execUtils } from '@yarnpkg/core';
export const getEventCommmits = async () => {
    if (context.eventName === 'push') {
        return context.payload.commits;
    }
    if (context.eventName === 'pull_request' && context.payload.pull_request) {
        const url = context.payload.pull_request.commits_url;
        return getOctokit(process.env.GITHUB_TOKEN).paginate(`GET ${url}`, context.repo);
    }
    console.log(`Unknown event "${context.eventName}". Only "push" and "pull_request" supported.`);
    return [];
};
export const getCommitData = async (ref) => {
    const commit = await getOctokit(process.env.GITHUB_TOKEN).rest.repos.getCommit({
        ...context.repo,
        ref,
    });
    return commit;
};
export const getChangedCommmits = async () => {
    const eventCommits = await getEventCommmits();
    return Promise.all(eventCommits.map((commit) => getCommitData(commit.id || commit.sha)));
};
export const getGithubChangedFiles = async () => {
    const commits = await getChangedCommmits();
    return commits
        .map((commit) => {
        var _a;
        if (!((_a = commit === null || commit === void 0 ? void 0 : commit.data) === null || _a === void 0 ? void 0 : _a.files)) {
            return [];
        }
        return commit.data.files.map((file) => file.filename).filter(Boolean);
    })
        .flat();
};
export const getChangedFiles = async (project, gitRange) => {
    if (process.env.GITHUB_EVENT_PATH && process.env.GITHUB_TOKEN) {
        return getGithubChangedFiles();
    }
    const { stdout } = await execUtils.execvp('git', ['diff', '--name-only', ...(gitRange ? [gitRange] : [])], {
        cwd: project.cwd,
        strict: true,
    });
    return stdout.split(/\r?\n/).filter(Boolean);
};
